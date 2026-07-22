import { resolve } from 'node:path';
import { ServerResponse } from 'node:http';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { configurations, mediaConfig, validate } from '@/config';
import { DatabaseModule } from '@/database/database.module';
import { RedisModule } from '@/redis/redis.module';
import { HealthModule } from '@/health/health.module';
import { AutenticacionModule } from '@/modules/autenticacion/autenticacion.module';
import { UsuariosModule } from '@/modules/usuarios/usuarios.module';
import { CatalogoModule } from '@/modules/catalogo/catalogo.module';
import { ProcesamientoVideoModule } from '@/modules/procesamiento-video/procesamiento-video.module';
import { ProgresoVisualizacionModule } from '@/modules/progreso-visualizacion/progreso-visualizacion.module';

@Module({
  imports: [
    // Global, validated config. `validate` aborts boot on a bad/missing env var.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: configurations,
      validate,
      envFilePath: ['.env.local', '.env'],
    }),

    // Infrastructure
    DatabaseModule,
    RedisModule,

    // Sirve el HLS generado (Fase 5) bajo MEDIA_PUBLIC_PATH con MIME correcto.
    ServeStaticModule.forRootAsync({
      inject: [mediaConfig.KEY],
      useFactory: (media: ConfigType<typeof mediaConfig>) => [
        {
          rootPath: resolve(media.outputDir),
          serveRoot: media.publicPath,
          serveStaticOptions: {
            setHeaders: (res: ServerResponse, ruta: string) => {
              if (ruta.endsWith('.m3u8')) {
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
              } else if (ruta.endsWith('.ts')) {
                res.setHeader('Content-Type', 'video/mp2t');
              }
            },
          },
        },
      ],
    }),

    // Cross-cutting
    HealthModule,

    // Feature modules (se completan a lo largo de las Fases 2-8)
    AutenticacionModule,
    UsuariosModule,
    CatalogoModule,
    ProcesamientoVideoModule,
    ProgresoVisualizacionModule,
  ],
})
export class AppModule {}
