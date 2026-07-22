import { resolve } from 'node:path';
import { ServerResponse } from 'node:http';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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

    /**
     * Límite de peticiones por IP. El global es holgado —navegar el catálogo
     * dispara varias peticiones seguidas— y los endpoints sensibles llevan el
     * suyo propio con @Throttle.
     *
     * El almacén es en memoria: basta con una instancia, que es lo que hay.
     * Con varias réplicas cada una contaría por su cuenta y habría que pasarlo
     * a Redis, que ya está disponible.
     */
    ThrottlerModule.forRoot([{ name: 'general', ttl: 60_000, limit: 150 }]),

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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
