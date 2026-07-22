import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginacionDto } from '@/common/dto/paginacion.dto';
import { TipoContenido } from '../enums/tipo-contenido.enum';

/** Orden del listado de catálogo. */
export enum OrdenContenido {
  RECIENTE = 'RECIENTE',
  TITULO = 'TITULO',
  ANIO = 'ANIO',
}

/** Coerción robusta de booleanos que llegan como string en la query. */
const aBooleano = ({ value }: { value: unknown }): unknown =>
  value === true || value === 'true' ? true : value === false || value === 'false' ? false : value;

/** Filtros + paginación del listado público de contenido. */
export class ConsultarContenidoDto extends PaginacionDto {
  @ApiPropertyOptional({ description: 'Búsqueda por título' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ enum: TipoContenido })
  @IsOptional()
  @IsEnum(TipoContenido)
  tipo?: TipoContenido;

  @ApiPropertyOptional({ description: 'Filtra por slug de género', example: 'accion' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  generoSlug?: string;

  @ApiPropertyOptional({
    description:
      'Busca solo en el título, no en la sinopsis. Para sugerencias: al ' +
      'escribir "bat" nadie espera resultados cuya sinopsis mencione la palabra.',
  })
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  soloTitulo?: boolean;

  @ApiPropertyOptional({ description: 'Solo destacados' })
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  destacado?: boolean;

  @ApiPropertyOptional({
    description: 'Filtra por estado de publicación (solo gestión admin)',
  })
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  publicado?: boolean;

  @ApiPropertyOptional({ enum: OrdenContenido, default: OrdenContenido.RECIENTE })
  @IsOptional()
  @IsEnum(OrdenContenido)
  orden: OrdenContenido = OrdenContenido.RECIENTE;
}
