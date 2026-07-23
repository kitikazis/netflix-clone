import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubidaVideo } from './entities/subida-video.entity';
import { ALMACENAMIENTO, Almacenamiento, DestinoSubida } from './almacenamiento/almacenamiento';
import { TipoActivo } from './transcodificacion.constants';

/** Quién pide la subida, sacado del token. */
export interface Autor {
  id: string;
  correo: string;
}

/**
 * Lleva la cuenta de los vídeos subidos: quién, qué, cuándo y para qué título.
 *
 * El registro se crea al pedir la URL de destino, no al terminar de subir,
 * porque en ese momento es cuando se sabe quién lo pide: los bytes van directos
 * al almacenamiento y esa petición ya no pasa por la API. Luego se confirma
 * comprobando que el archivo esté de verdad donde debía.
 */
@Injectable()
export class SubidasService {
  private readonly logger = new Logger(SubidasService.name);

  constructor(
    @InjectRepository(SubidaVideo)
    private readonly repo: Repository<SubidaVideo>,
    @Inject(ALMACENAMIENTO) private readonly almacenamiento: Almacenamiento,
  ) {}

  /** Prepara el destino y deja anotado quién va a subir qué. */
  async preparar(nombreArchivo: string, contentType: string, autor: Autor): Promise<DestinoSubida> {
    const destino = await this.almacenamiento.prepararSubida(nombreArchivo, contentType);

    await this.repo.save(
      this.repo.create({
        clave: destino.clave,
        nombreArchivo,
        contentType,
        subidoPorId: autor.id,
        subidoPorCorreo: autor.correo,
      }),
    );

    return destino;
  }

  /**
   * Confirma que el archivo llegó.
   *
   * Se llama cuando el cliente dice haber terminado. Si el archivo no está, no
   * se marca: así una subida cortada a medias se distingue de una completa.
   */
  async confirmar(clave: string, tamanoBytes?: number): Promise<void> {
    const existe = await this.almacenamiento.existeOrigen(clave);
    if (!existe) {
      this.logger.warn(`Se dijo que ${clave} estaba subido, pero no se encuentra`);
      return;
    }
    await this.repo.update(
      { clave },
      {
        fechaConfirmacion: new Date(),
        tamanoBytes: tamanoBytes ? String(tamanoBytes) : null,
      },
    );
  }

  /** Ata la subida al título o episodio al que se le asigna. */
  async asignar(clave: string, tipo: TipoActivo, activoId: string): Promise<void> {
    const destino =
      tipo === TipoActivo.CONTENIDO ? { contenidoId: activoId } : { episodioId: activoId };
    await this.repo.update({ clave }, destino);
  }
}
