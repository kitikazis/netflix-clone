import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogoService } from './catalogo.service';
import { ConsultarContenidoDto } from './dto/consultar-contenido.dto';

/**
 * Superficie PÚBLICA del catálogo: solo devuelve títulos publicados.
 * La gestión (crear/editar/borrar, ver borradores) vive en AdminContenidoController.
 */
@ApiTags('catalogo · contenido')
@Controller('catalogo/contenido')
export class ContenidoController {
  constructor(private readonly catalogo: CatalogoService) {}

  @ApiOperation({ summary: 'Lista contenido publicado (búsqueda, filtros, paginación)' })
  @Get()
  listar(@Query() dto: ConsultarContenidoDto) {
    return this.catalogo.listar(dto, true);
  }

  @ApiOperation({ summary: 'Detalle de un título publicado por slug' })
  @Get(':slug')
  detalle(@Param('slug') slug: string) {
    return this.catalogo.detallePublicadoPorSlug(slug);
  }
}
