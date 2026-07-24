import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storageConfig } from '@/config';
import { Almacenamiento, DestinoSubida, OrigenMaterializado } from './almacenamiento';
import { construirClaveOrigen, sanitizarNombreArchivo } from './subidas.constants';

/** Subidas simultáneas al publicar el HLS (ver `publicarHls`). */
const SUBIDAS_EN_PARALELO = 6;

/**
 * Implementación de {@link Almacenamiento} sobre Cloudflare R2 (API S3).
 * - Origen: descarga el objeto a un archivo temporal para que ffmpeg lo lea.
 * - Salida: sube cada archivo del HLS al bucket (servido por la URL pública).
 * - Subida: emite una URL PUT prefirmada; el cliente sube directo a R2.
 * Las credenciales se exigen solo al usar el driver (config validada al arrancar).
 */
@Injectable()
export class AlmacenamientoR2 implements Almacenamiento {
  private readonly config: ConfigType<typeof storageConfig>['r2'];
  private readonly client?: S3Client;

  constructor(@Inject(storageConfig.KEY) config: ConfigType<typeof storageConfig>) {
    this.config = config.r2;
    const { accountId, accessKeyId, secretAccessKey, endpoint } = this.config;

    // El endpoint sale de S3_ENDPOINT si está; si no, se deriva de la cuenta de
    // R2 como hasta ahora. Así el driver vale para cualquier S3 compatible
    // (Supabase Storage, Backblaze B2, MinIO) sin cambiar el comportamiento
    // existente: con solo las R2_* configuradas apunta a R2 igual que antes.
    const url =
      endpoint ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

    if (url && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: this.config.region,
        endpoint: url,
        forcePathStyle: this.config.forcePathStyle,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  async existeOrigen(claveOrigen: string): Promise<boolean> {
    const { client, bucket } = this.exigirConfigurado();
    try {
      // HEAD: pregunta por los metadatos sin traerse el vídeo entero.
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: claveOrigen }));
      return true;
    } catch {
      return false;
    }
  }

  async materializarOrigen(claveOrigen: string): Promise<OrigenMaterializado> {
    const { client, bucket } = this.exigirConfigurado();
    let cuerpo: Readable;
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: claveOrigen }));
      if (!res.Body) throw new NotFoundException();
      cuerpo = res.Body as Readable;
    } catch {
      throw new NotFoundException(`No existe el vídeo fuente en R2: ${claveOrigen}`);
    }

    const dir = await mkdtemp(join(tmpdir(), 'r2-origen-'));
    const rutaLocal = join(dir, sanitizarNombreArchivo(basename(claveOrigen)));
    await pipeline(cuerpo, createWriteStream(rutaLocal));

    return { rutaLocal, limpiar: () => rm(dir, { recursive: true, force: true }) };
  }

  /**
   * Publica el HLS subiendo varios archivos a la vez.
   *
   * Cada subida cuesta unos 0,6 s casi enteros de ida y vuelta, no de ancho de
   * banda: un trozo pesa menos de un mega. Encadenadas de una en una, una
   * película de dos horas en tres calidades son unos 1200 trozos y cerca de
   * trece minutos esperando a la red. De seis en seis baja a algo más de dos.
   *
   * Seis y no más porque el contenedor tiene 512 MB y cada subida en vuelo
   * mantiene su archivo en memoria; con la escalera actual eso son unos 12 MB,
   * que caben de sobra.
   */
  async publicarHls(dirLocal: string, destinoPrefijo: string): Promise<void> {
    const { client, bucket } = this.exigirConfigurado();
    const entradas = await readdir(dirLocal);

    const archivos: string[] = [];
    for (const nombre of entradas) {
      if ((await stat(join(dirLocal, nombre))).isFile()) archivos.push(nombre);
    }

    const subir = async (nombre: string) => {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${destinoPrefijo}/${nombre}`,
          Body: await readFile(join(dirLocal, nombre)),
          ContentType: this.tipoContenido(nombre),
        }),
      );
    };

    // Seis obreros tirando de la misma lista: cada uno coge el siguiente en
    // cuanto termina, así ninguno se queda parado esperando a los demás.
    let siguiente = 0;
    const obrero = async () => {
      while (siguiente < archivos.length) {
        await subir(archivos[siguiente++]);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(SUBIDAS_EN_PARALELO, archivos.length) }, obrero),
    );
  }

  urlPublica(clave: string): string {
    const base = this.config.publicBaseUrl;
    if (!base) {
      throw new InternalServerErrorException('Falta R2_PUBLIC_BASE_URL');
    }
    return `${base}/${clave.replace(/^\/+/, '').replace(/\\/g, '/')}`;
  }

  async prepararSubida(nombreArchivo: string, contentType: string): Promise<DestinoSubida> {
    const { client, bucket } = this.exigirConfigurado();
    const clave = construirClaveOrigen(nombreArchivo, randomUUID());
    const expiraEn = this.config.presignExpiresSeconds;

    const url = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: clave, ContentType: contentType }),
      { expiresIn: expiraEn },
    );

    return {
      clave,
      url,
      metodo: 'PUT',
      headers: { 'Content-Type': contentType },
      expiraEn,
    };
  }

  guardarStream(): Promise<void> {
    // Con R2 la subida directa la hace el cliente contra la URL prefirmada.
    throw new BadRequestException(
      'Con el driver R2, sube usando la URL prefirmada de /admin/subidas/firmar',
    );
  }

  private exigirConfigurado(): { client: S3Client; bucket: string } {
    if (!this.client || !this.config.bucket) {
      throw new InternalServerErrorException(
        'Almacenamiento R2 no configurado (revisa R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET)',
      );
    }
    return { client: this.client, bucket: this.config.bucket };
  }

  private tipoContenido(nombre: string): string {
    if (nombre.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
    if (nombre.endsWith('.ts')) return 'video/mp2t';
    return 'application/octet-stream';
  }
}
