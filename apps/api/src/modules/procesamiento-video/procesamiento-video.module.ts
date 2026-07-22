import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { redisConfig, storageConfig } from '@/config';
import { CatalogoModule } from '@/modules/catalogo/catalogo.module';
import { COLA_TRANSCODIFICACION } from './transcodificacion.constants';
import { TranscodificacionService } from './transcodificacion.service';
import { TranscodificacionProcessor } from './transcodificacion.processor';
import { FfmpegService } from './ffmpeg.service';
import { ProcesamientoVideoController } from './procesamiento-video.controller';
import { SubidasController } from './subidas.controller';
import { ALMACENAMIENTO } from './almacenamiento/almacenamiento';
import { AlmacenamientoLocal } from './almacenamiento/almacenamiento-local.service';
import { AlmacenamientoR2 } from './almacenamiento/almacenamiento-r2.service';

/**
 * Procesamiento de vídeo (Fase 5) + subida/almacenamiento (Fase 6).
 * La cola BullMQ reutiliza Redis (config validada). El almacenamiento se elige
 * por `STORAGE_DRIVER`: `local` (disco) o `r2` (Cloudflare R2 vía API S3).
 */
@Module({
  imports: [
    CatalogoModule, // repos de Contenido/Episodio para actualizar el estado
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (config: ConfigType<typeof redisConfig>) => ({
        connection: {
          host: config.host,
          port: config.port,
          password: config.password,
        },
      }),
    }),
    BullModule.registerQueue({ name: COLA_TRANSCODIFICACION }),
  ],
  controllers: [ProcesamientoVideoController, SubidasController],
  providers: [
    TranscodificacionService,
    TranscodificacionProcessor,
    FfmpegService,
    AlmacenamientoLocal,
    AlmacenamientoR2,
    {
      provide: ALMACENAMIENTO,
      inject: [storageConfig.KEY, AlmacenamientoLocal, AlmacenamientoR2],
      useFactory: (
        config: ConfigType<typeof storageConfig>,
        local: AlmacenamientoLocal,
        r2: AlmacenamientoR2,
      ) => (config.driver === 'r2' ? r2 : local),
    },
  ],
  exports: [TranscodificacionService, ALMACENAMIENTO],
})
export class ProcesamientoVideoModule {}
