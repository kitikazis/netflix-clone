import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoModule } from '@/modules/catalogo/catalogo.module';
import { ProgresoVisualizacion } from './entities/progreso-visualizacion.entity';
import { ProgresoVisualizacionService } from './progreso-visualizacion.service';
import { ProgresoVisualizacionController } from './progreso-visualizacion.controller';

/**
 * Progreso de visualización e historial ("continuar viendo") — Fase 8.
 * Redis (global) mantiene el estado caliente; Postgres el durable. Importa
 * CatalogoModule para validar/hidratar contenido y episodios.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ProgresoVisualizacion]), CatalogoModule],
  controllers: [ProgresoVisualizacionController],
  providers: [ProgresoVisualizacionService],
  exports: [TypeOrmModule],
})
export class ProgresoVisualizacionModule {}
