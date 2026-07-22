import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Contenido } from '@/modules/catalogo/entities/contenido.entity';
import { Episodio } from '@/modules/catalogo/entities/episodio.entity';
import { TipoContenido } from '@/modules/catalogo/enums/tipo-contenido.enum';
import { EstadoProcesamiento } from '@/modules/catalogo/enums/estado-procesamiento.enum';
import {
  COLA_TRANSCODIFICACION,
  DatosJobTranscodificacion,
  JOB_TRANSCODIFICAR,
  TipoActivo,
} from './transcodificacion.constants';

/** Cambios acotados a los campos del pipeline (compartidos por ambas entidades). */
interface CambiosProcesamiento {
  estadoProcesamiento?: EstadoProcesamiento;
  videoOrigenClave?: string | null;
  hlsPlaylistUrl?: string | null;
  duracionSegundos?: number | null;
  errorProcesamiento?: string | null;
}

/**
 * Orquesta el pipeline: encola jobs de transcodificación y actualiza el estado
 * del activo (película o episodio). El trabajo pesado (ffmpeg) vive en el
 * TranscodificacionProcessor; aquí solo va la coordinación y el estado.
 */
@Injectable()
export class TranscodificacionService {
  constructor(
    @InjectQueue(COLA_TRANSCODIFICACION)
    private readonly cola: Queue<DatosJobTranscodificacion>,
    @InjectRepository(Contenido)
    private readonly contenidoRepo: Repository<Contenido>,
    @InjectRepository(Episodio)
    private readonly episodioRepo: Repository<Episodio>,
  ) {}

  /** Encola la transcodificación de una película (Contenido tipo PELICULA). */
  async encolarContenido(contenidoId: string, claveOrigen: string) {
    const contenido = await this.contenidoRepo.findOne({ where: { id: contenidoId } });
    if (!contenido) {
      throw new NotFoundException('Contenido no encontrado');
    }
    if (contenido.tipo !== TipoContenido.PELICULA) {
      throw new BadRequestException(
        'Solo las películas se procesan a nivel de título; en series procesa cada episodio',
      );
    }
    return this.encolar(TipoActivo.CONTENIDO, contenidoId, claveOrigen);
  }

  /** Encola la transcodificación de un episodio. */
  async encolarEpisodio(episodioId: string, claveOrigen: string) {
    const episodio = await this.episodioRepo.findOne({ where: { id: episodioId } });
    if (!episodio) {
      throw new NotFoundException('Episodio no encontrado');
    }
    return this.encolar(TipoActivo.EPISODIO, episodioId, claveOrigen);
  }

  // --- Transiciones de estado usadas por el processor ---

  iniciar(tipo: TipoActivo, activoId: string): Promise<void> {
    return this.actualizar(tipo, activoId, {
      estadoProcesamiento: EstadoProcesamiento.PROCESANDO,
      errorProcesamiento: null,
    });
  }

  completar(
    tipo: TipoActivo,
    activoId: string,
    datos: { hlsPlaylistUrl: string; duracionSegundos: number },
  ): Promise<void> {
    return this.actualizar(tipo, activoId, {
      estadoProcesamiento: EstadoProcesamiento.LISTO,
      hlsPlaylistUrl: datos.hlsPlaylistUrl,
      duracionSegundos: datos.duracionSegundos,
      errorProcesamiento: null,
    });
  }

  fallar(tipo: TipoActivo, activoId: string, mensaje: string): Promise<void> {
    return this.actualizar(tipo, activoId, {
      estadoProcesamiento: EstadoProcesamiento.ERROR,
      errorProcesamiento: mensaje.slice(0, 2000),
    });
  }

  private async encolar(tipo: TipoActivo, activoId: string, claveOrigen: string) {
    await this.actualizar(tipo, activoId, {
      videoOrigenClave: claveOrigen,
      estadoProcesamiento: EstadoProcesamiento.EN_COLA,
      errorProcesamiento: null,
    });

    const job = await this.cola.add(
      JOB_TRANSCODIFICAR,
      { tipo, activoId, claveOrigen },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      tipo,
      activoId,
      jobId: job.id,
      estadoProcesamiento: EstadoProcesamiento.EN_COLA,
    };
  }

  private async actualizar(
    tipo: TipoActivo,
    id: string,
    cambios: CambiosProcesamiento,
  ): Promise<void> {
    if (tipo === TipoActivo.CONTENIDO) {
      await this.contenidoRepo.update({ id }, cambios);
    } else {
      await this.episodioRepo.update({ id }, cambios);
    }
  }
}
