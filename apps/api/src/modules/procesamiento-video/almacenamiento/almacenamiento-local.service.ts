import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, cp, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { mediaConfig } from '@/config';
import { Almacenamiento, DestinoSubida, OrigenMaterializado } from './almacenamiento';
import { RUTA_SUBIDA_DIRECTA, sanitizarNombreArchivo } from './subidas.constants';

/**
 * Implementación de {@link Almacenamiento} sobre disco local.
 * - Origen: archivos bajo `MEDIA_SOURCE_DIR`.
 * - Salida: se copia el HLS a `MEDIA_OUTPUT_DIR`, servido en `MEDIA_PUBLIC_PATH`.
 * - Subida: el cliente hace PUT al endpoint de subida directa de la API.
 * En producción se usa `AlmacenamientoR2` con el mismo contrato.
 */
@Injectable()
export class AlmacenamientoLocal implements Almacenamiento {
  private readonly sourceDir: string;
  private readonly outputDir: string;
  private readonly publicPath: string;

  constructor(@Inject(mediaConfig.KEY) config: ConfigType<typeof mediaConfig>) {
    this.sourceDir = resolve(config.sourceDir);
    this.outputDir = resolve(config.outputDir);
    this.publicPath = config.publicPath.replace(/\/+$/, '');
  }

  async materializarOrigen(claveOrigen: string): Promise<OrigenMaterializado> {
    const rutaLocal = this.resolverDentro(this.sourceDir, claveOrigen);
    try {
      await access(rutaLocal);
    } catch {
      throw new NotFoundException(`No existe el vídeo fuente: ${claveOrigen}`);
    }
    // En local no hay descarga temporal que limpiar.
    return { rutaLocal, limpiar: () => Promise.resolve() };
  }

  async publicarHls(dirLocal: string, destinoPrefijo: string): Promise<void> {
    const destino = this.resolverDentro(this.outputDir, destinoPrefijo);
    await mkdir(destino, { recursive: true });
    await cp(dirLocal, destino, { recursive: true });
  }

  urlPublica(clave: string): string {
    const limpia = clave.replace(/^\/+/, '').replace(/\\/g, '/');
    return `${this.publicPath}/${limpia}`;
  }

  prepararSubida(nombreArchivo: string, _contentType: string): Promise<DestinoSubida> {
    const clave = `origen/${randomUUID()}/${sanitizarNombreArchivo(nombreArchivo)}`;
    return Promise.resolve({
      clave,
      url: `${RUTA_SUBIDA_DIRECTA}?clave=${encodeURIComponent(clave)}`,
      metodo: 'PUT',
    });
  }

  async guardarStream(clave: string, datos: Readable): Promise<void> {
    const destino = this.resolverDentro(this.sourceDir, clave);
    await mkdir(dirname(destino), { recursive: true });
    await pipeline(datos, createWriteStream(destino));
  }

  /** Une base + clave relativa impidiendo escapes tipo `../` (path traversal). */
  private resolverDentro(base: string, clave: string): string {
    if (isAbsolute(clave)) {
      throw new BadRequestException('La clave debe ser una ruta relativa');
    }
    const destino = resolve(base, clave);
    if (destino !== base && !destino.startsWith(base + sep)) {
      throw new BadRequestException('Clave fuera del directorio permitido');
    }
    return destino;
  }
}
