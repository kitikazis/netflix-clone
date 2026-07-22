import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginacionDto } from '@/common/dto/paginacion.dto';

/**
 * Filtros del listado de cuentas.
 *
 * `q` va aquí y no como @Query suelto: el ValidationPipe global usa
 * `forbidNonWhitelisted`, así que valida el objeto de query completo contra el
 * DTO y rechaza con un 400 cualquier parámetro que no esté declarado en él.
 */
export class ConsultarUsuariosDto extends PaginacionDto {
  @ApiPropertyOptional({ description: 'Búsqueda por correo' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}
