import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Inject, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { mediaConfig } from '@/config';
import { TranscodificacionService } from './transcodificacion.service';
import { FfmpegService } from './ffmpeg.service';
import { ALMACENAMIENTO, Almacenamiento } from './almacenamiento/almacenamiento';
import { COLA_TRANSCODIFICACION, DatosJobTranscodificacion } from './transcodificacion.constants';

/**
 * Worker BullMQ que ejecuta la transcodificación ffmpeg → HLS de un job:
 * materializa el origen, genera el HLS en un dir temporal, lo publica en el
 * almacenamiento y actualiza el estado del activo. Los fallos se marcan y se
 * relanzan para que BullMQ reintente según la política del job.
 */
@Processor(COLA_TRANSCODIFICACION)
export class TranscodificacionProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(TranscodificacionProcessor.name);
  private readonly workDir: string;

  constructor(
    private readonly transcod: TranscodificacionService,
    private readonly ffmpeg: FfmpegService,
    @Inject(ALMACENAMIENTO) private readonly almacenamiento: Almacenamiento,
    @Inject(mediaConfig.KEY) private readonly config: ConfigType<typeof mediaConfig>,
  ) {
    super();
    this.workDir = resolve(config.workDir);
  }

  onApplicationBootstrap(): void {
    // El worker ya está creado en este punto. Concurrencia configurable (validada)
    // en vez de fija en el decorador.
    if (this.worker) {
      this.worker.concurrency = this.config.transcodeConcurrency;
    }
  }

  async process(job: Job<DatosJobTranscodificacion>) {
    const { tipo, activoId, claveOrigen } = job.data;
    this.logger.log(`Iniciando job ${job.id}: ${tipo} ${activoId} ← ${claveOrigen}`);

    await this.transcod.iniciar(tipo, activoId);
    const origen = await this.almacenamiento.materializarOrigen(claveOrigen);
    const dirTrabajo = join(this.workDir, `${activoId}-${job.id}`);

    try {
      await mkdir(dirTrabajo, { recursive: true });

      const { master, duracionSegundos } = await this.ffmpeg.generarHls(
        origen.rutaLocal,
        dirTrabajo,
        (porcentaje) => void job.updateProgress(porcentaje),
      );

      const prefijo = await this.transcod.prefijoDestino(tipo, activoId);
      await this.almacenamiento.publicarHls(dirTrabajo, prefijo);
      const hlsPlaylistUrl = this.almacenamiento.urlPublica(`${prefijo}/${master}`);

      await this.transcod.completar(tipo, activoId, {
        hlsPlaylistUrl,
        duracionSegundos,
      });
      this.logger.log(`Job ${job.id} completado: ${hlsPlaylistUrl}`);
      return { hlsPlaylistUrl, duracionSegundos };
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      await this.transcod.fallar(tipo, activoId, mensaje);
      this.logger.error(`Job ${job.id} falló: ${mensaje}`);
      throw err;
    } finally {
      await origen.limpiar().catch(() => undefined);
      await rm(dirTrabajo, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
