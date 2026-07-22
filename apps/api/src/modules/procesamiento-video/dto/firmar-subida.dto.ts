import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class FirmarSubidaDto {
  @ApiProperty({ example: 'mi-pelicula.mp4' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nombreArchivo: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(/^[\w.+-]+\/[\w.+-]+$/, { message: 'contentType debe ser un MIME válido' })
  contentType: string;
}
