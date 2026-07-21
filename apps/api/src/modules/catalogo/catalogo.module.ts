import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contenido } from './entities/contenido.entity';
import { Episodio } from './entities/episodio.entity';
import { Genero } from './entities/genero.entity';

/**
 * Catálogo (contenido, episodios, géneros): CRUD + búsqueda + paginación — Fase 4.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Contenido, Episodio, Genero])],
  exports: [TypeOrmModule],
})
export class CatalogoModule {}
