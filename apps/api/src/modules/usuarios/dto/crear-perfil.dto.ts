import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CrearPerfilDto {
  @ApiProperty({ example: 'Ana' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ example: 'https://cdn.ejemplo.com/avatar.png' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  esInfantil?: boolean;

  @ApiPropertyOptional({ example: 'es', default: 'es' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  idioma?: string;
}
