import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TipoContenido } from '../enums/tipo-contenido.enum';

/**
 * Alta de un título del catálogo. El `slug` se autogenera a partir del título
 * (garantizando unicidad) si no se envía uno explícito.
 */
export class CrearContenidoDto {
  @ApiProperty({ enum: TipoContenido })
  @IsEnum(TipoContenido)
  tipo: TipoContenido;

  @ApiProperty({ example: 'Los Increíbles 2' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  titulo: string;

  @ApiPropertyOptional({
    description: 'Opcional; se deriva del título si se omite',
    example: 'los-increibles-2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sinopsis?: string;

  @ApiPropertyOptional({ example: 2018, minimum: 1900, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  anioLanzamiento?: number;

  @ApiPropertyOptional({ example: 'PG-13' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  clasificacionEdad?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ejemplo.com/poster.jpg' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  posterUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ejemplo.com/backdrop.jpg' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  backdropUrl?: string;

  @ApiPropertyOptional({
    description: 'Solo aplica a películas; en series vive en cada episodio',
    example: 118,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  duracionMinutos?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  destacado?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Visible en el catálogo público' })
  @IsOptional()
  @IsBoolean()
  publicado?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs de géneros a asociar',
    example: ['3f2504e0-4f89-11d3-9a0c-0305e82c3301'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  generoIds?: string[];
}
