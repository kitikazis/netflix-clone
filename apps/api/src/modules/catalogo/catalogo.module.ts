import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contenido } from './entities/contenido.entity';
import { Episodio } from './entities/episodio.entity';
import { Genero } from './entities/genero.entity';
import { CatalogoService } from './catalogo.service';
import { GenerosService } from './generos.service';
import { EpisodiosService } from './episodios.service';
import { ContenidoController } from './contenido.controller';
import { AdminContenidoController } from './admin-contenido.controller';
import { GenerosController } from './generos.controller';
import { EpisodiosController } from './episodios.controller';

/**
 * Catálogo (contenido, episodios, géneros): CRUD + búsqueda + paginación — Fase 4.
 * Lecturas públicas (solo publicado) y gestión admin (rol ADMIN).
 * Exporta servicios + repos para que ProcesamientoVideoModule (Fase 5) actualice
 * el estado de transcodificación de cada título/episodio.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Contenido, Episodio, Genero])],
  controllers: [
    ContenidoController,
    AdminContenidoController,
    GenerosController,
    EpisodiosController,
  ],
  providers: [CatalogoService, GenerosService, EpisodiosService],
  exports: [CatalogoService, GenerosService, EpisodiosService, TypeOrmModule],
})
export class CatalogoModule {}
