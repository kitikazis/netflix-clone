import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configurations, validate } from '@/config';
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
