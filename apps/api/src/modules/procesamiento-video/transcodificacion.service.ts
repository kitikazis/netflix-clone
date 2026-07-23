import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { In, Repository } from 'typeorm';
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
import { PREFIJO_HLS } from './almacenamiento/subidas.constants';
import { ALMACENAMIENTO, Almacenamiento } from './almacenamiento/almacenamiento';

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
export class TranscodificacionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TranscodificacionService.name);

  constructor(
    @InjectQueue(COLA_TRANSCODIFICACION)
    private readonly cola: Queue<DatosJobTranscodificacion>,
    @InjectRepository(Contenido)
    private readonly contenidoRepo: Repository<Contenido>,
    @InjectRepository(Episodio)
    private readonly episodioRepo: Repository<Episodio>,
    @Inject(ALMACENAMIENTO)
    private readonly almacenamiento: Almacenamiento,
  ) {}

  /**
   * Progreso de lo que hay ahora mismo en la cola, por activo.
   *
   * El porcentaje se queda en BullMQ y no se guarda en Postgres a propósito:
   * ffmpeg lo actualiza varias veces por segundo, y sería reescribir la misma
   * fila sin parar para un dato que deja de existir en cuanto el trabajo acaba.
   * Quien lo quiera, que lo pregunte.
   */
  async progresos(): Promise<Record<string, number>> {
    const trabajos = await this.cola.getJobs(['active', 'waiting', 'delayed'], 0, 100);
    const salida: Record<string, number> = {};
    for (const trabajo of trabajos) {
      const id = trabajo?.data?.activoId;
      if (!id) continue;
      // Los que aún no ha cogido nadie no tienen progreso: cuentan como cero.
      salida[id] = typeof trabajo.progress === 'number' ? Math.round(trabajo.progress) : 0;
    }
    return salida;
  }

  /**
   * Rescata lo que se quedó a medias.
   *
   * Un trabajo puede morir sin avisar: se reinicia el servicio, el proceso se
   * queda sin memoria, el hosting gratuito duerme el contenedor. La fila se
   * queda en PROCESANDO para siempre —nadie va a terminarla— y desde el panel
   * es indistinguible de una que va a acabar en un minuto.
   *
   * Al arrancar se comparan las filas en PROCESANDO con lo que hay realmente en
   * la cola. Las que no tengan trabajo vivo se vuelven a encolar solas, que la
   * clave del vídeo original sigue guardada y no hace falta volver a subirlo.
   * Si ni eso queda, se marcan como error en vez de mentir.
   */
  async onApplicationBootstrap(): Promise<void> {
    const vivos = new Set(Object.keys(await this.progresos()));

    for (const [tipo, repo] of [
      [TipoActivo.CONTENIDO, this.contenidoRepo],
      [TipoActivo.EPISODIO, this.episodioRepo],
    ] as const) {
      // EN_COLA cuenta igual que PROCESANDO: un trabajo que muere esperando
      // turno deja la fila igual de colgada que uno que muere a medio convertir.
      const colgados = await repo.find({
        where: {
          estadoProcesamiento: In([EstadoProcesamiento.EN_COLA, EstadoProcesamiento.PROCESANDO]),
        },
      });

      for (const fila of colgados) {
        if (vivos.has(fila.id)) continue;

        // Se comprueba que el original siga ahí antes de reencolar: si no está,
        // reintentar solo repetiría el mismo fallo en cada arranque, para siempre.
        const recuperable =
          !!fila.videoOrigenClave &&
          (await this.almacenamiento.existeOrigen(fila.videoOrigenClave));

        if (recuperable) {
          this.logger.warn(`Retomando ${tipo} ${fila.id}: se quedó a medias`);
          await this.encolar(tipo, fila.id, fila.videoOrigenClave!);
        } else {
          this.logger.warn(`${tipo} ${fila.id} se quedó a medias y ya no está su original`);
          await this.fallar(
            tipo,
            fila.id,
            'La conversión se interrumpió y el vídeo original ya no está: hay que subirlo otra vez',
          );
        }
      }
    }
  }

  /**
   * Reintenta la conversión con el vídeo que ya se subió.
   *
   * No hace falta volver a subir nada: la clave del original está en la fila
   * desde la primera vez.
   */
  async reintentar(tipo: TipoActivo, activoId: string) {
    const repo = tipo === TipoActivo.CONTENIDO ? this.contenidoRepo : this.episodioRepo;
    const fila = await repo.findOne({ where: { id: activoId } });
    if (!fila) {
      throw new NotFoundException('No encontrado');
    }
    if (!fila.videoOrigenClave) {
      throw new BadRequestException('No hay vídeo original guardado: hay que subirlo otra vez');
    }
    return this.encolar(tipo, activoId, fila.videoOrigenClave);
  }

  /**
   * Prefijo bajo el que se publica el HLS de un activo.
   *
   * Va por el slug y no por el id porque estas carpetas se acaban mirando a
   * mano en el panel del almacenamiento, y un UUID no dice de qué título es;
   * había que ir a consultarlo a la base de datos. Los episodios cuelgan de su
   * serie con la numeración de siempre: `hls/mi-serie/t1e2`.
   *
   * Si un título se renombra, su slug cambia y el HLS ya publicado se queda con
   * el nombre viejo. No rompe nada —la URL se guarda entera en la fila—, pero
   * hasta que se vuelva a transcodificar la carpeta llevará el nombre anterior.
   */
  async prefijoDestino(tipo: TipoActivo, activoId: string): Promise<string> {
    if (tipo === TipoActivo.CONTENIDO) {
      const contenido = await this.contenidoRepo.findOne({ where: { id: activoId } });
      return `${PREFIJO_HLS}/${contenido?.slug ?? activoId}`;
    }

    const episodio = await this.episodioRepo.findOne({
      where: { id: activoId },
      relations: { contenido: true },
    });
    if (!episodio?.contenido) return `${PREFIJO_HLS}/${activoId}`;
    return `${PREFIJO_HLS}/${episodio.contenido.slug}/t${episodio.temporada}e${episodio.numeroEpisodio}`;
  }

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
