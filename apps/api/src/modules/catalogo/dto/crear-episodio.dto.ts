import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Alta de un episodio dentro de una serie. El `contenidoId` llega por la ruta
 * (POST /catalogo/contenido/:contenidoId/episodios), no en el cuerpo.
 */
export class CrearEpisodioDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(100)
  temporada: number;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(1000)
  numeroEpisodio: number;

  @ApiProperty({ example: 'Piloto' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  titulo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sinopsis?: string;

  @ApiPropertyOptional({ example: 48, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  duracionMinutos?: number;
}
