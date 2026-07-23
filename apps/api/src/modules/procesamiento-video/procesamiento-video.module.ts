import { Logger, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisConfig, storageConfig } from '@/config';
import { CatalogoModule } from '@/modules/catalogo/catalogo.module';
import { COLA_TRANSCODIFICACION } from './transcodificacion.constants';
import { TranscodificacionService } from './transcodificacion.service';
import { TranscodificacionProcessor } from './transcodificacion.processor';
import { FfmpegService } from './ffmpeg.service';
import { ProcesamientoVideoController } from './procesamiento-video.controller';
import { SubidasController } from './subidas.controller';
import { ALMACENAMIENTO } from './almacenamiento/almacenamiento';
import { SubidaVideo } from './entities/subida-video.entity';
import { SubidasService } from './subidas.service';
import { AlmacenamientoLocal } from './almacenamiento/almacenamiento-local.service';
import { AlmacenamientoR2 } from './almacenamiento/almacenamiento-r2.service';

/**
 * Procesamiento de vídeo (Fase 5) + subida/almacenamiento (Fase 6).
 * La cola BullMQ reutiliza Redis (config validada). El almacenamiento se elige
 * por `STORAGE_DRIVER`: `local` (disco) o `r2` (Cloudflare R2 vía API S3).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([SubidaVideo]),
    CatalogoModule, // repos de Contenido/Episodio para actualizar el estado
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (config: ConfigType<typeof redisConfig>) => ({
        connection: {
          host: config.host,
          port: config.port,
          password: config.password,
          // BullMQ abre sus propias conexiones, así que el TLS hay que
          // activarlo también aquí y no solo en el cliente compartido.
          ...(config.tls ? { tls: {} } : {}),
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
    SubidasService,
    AlmacenamientoLocal,
    AlmacenamientoR2,
    {
      provide: ALMACENAMIENTO,
      inject: [storageConfig.KEY, AlmacenamientoLocal, AlmacenamientoR2],
      useFactory: (
        config: ConfigType<typeof storageConfig>,
        local: AlmacenamientoLocal,
        r2: AlmacenamientoR2,
      ) => {
        /**
         * Se dice en voz alta cuál se ha elegido.
         *
         * `local` es el valor por defecto cuando no hay `STORAGE_DRIVER`, y esa
         * combinación —base de datos en la nube, vídeos en el disco de quien
         * levanta la API— es silenciosa y desconcertante: el vídeo se sube, se
         * convierte, el título aparece como LISTO… y en el bucket no hay nada,
         * porque todo se quedó en una carpeta local. Pasó, y costó horas verlo.
         */
        const registro = new Logger('Almacenamiento');
        if (config.driver === 'r2') {
          registro.log(`Vídeos en almacenamiento externo (bucket "${config.r2.bucket}")`);
          return r2;
        }
        registro.warn(
          'STORAGE_DRIVER=local: los vídeos se guardan en el disco de esta máquina, ' +
            'no en el bucket. Si esperabas que se subieran, revisa la configuración.',
        );
        return local;
      },
    },
  ],
  exports: [TranscodificacionService, SubidasService, ALMACENAMIENTO],
})
export class ProcesamientoVideoModule {}
