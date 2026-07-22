import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Parámetros de paginación reutilizables (query string).
 * Las query llegan como string; @Type + el ValidationPipe global las coercen.
 */
export class PaginacionDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Página (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite: number = 20;

  get offset(): number {
    return (this.pagina - 1) * this.limite;
  }
}

export interface MetaPaginacion {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface ResultadoPaginado<T> {
  datos: T[];
  paginacion: MetaPaginacion;
}

/** Envuelve un `[datos, total]` (p. ej. de getManyAndCount) en la forma paginada. */
export function paginar<T>(datos: T[], total: number, dto: PaginacionDto): ResultadoPaginado<T> {
  return {
    datos,
    paginacion: {
      pagina: dto.pagina,
      limite: dto.limite,
      total,
      totalPaginas: dto.limite > 0 ? Math.ceil(total / dto.limite) : 0,
    },
  };
}
