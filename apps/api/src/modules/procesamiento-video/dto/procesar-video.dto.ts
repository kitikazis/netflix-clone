import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ProcesarVideoDto {
  @ApiProperty({
    example: 'peliculas/mi-video.mp4',
    description:
      'Clave/ruta relativa del vídeo fuente en el almacenamiento (bajo MEDIA_SOURCE_DIR en local; objeto R2 en Fase 6)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  claveOrigen: string;
}
