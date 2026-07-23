import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ConfirmarSubidaDto {
  @ApiProperty({ example: 'origen/2026-07-23/mi-pelicula-a1b2c3d4.mp4' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  clave: string;

  @ApiPropertyOptional({ description: 'Tamaño real del archivo, para poder cotejarlo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tamanoBytes?: number;
}
