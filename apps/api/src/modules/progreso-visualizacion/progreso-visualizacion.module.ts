import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgresoVisualizacion } from './entities/progreso-visualizacion.entity';

/**
 * Progreso de visualización e historial ("continuar viendo"), respaldado en Redis — Fase 8.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ProgresoVisualizacion])],
  exports: [TypeOrmModule],
})
export class ProgresoVisualizacionModule {}
