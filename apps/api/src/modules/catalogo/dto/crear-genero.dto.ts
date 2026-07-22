import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearGeneroDto {
  @ApiProperty({ example: 'Acción' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nombre: string;

  @ApiPropertyOptional({
    description: 'Opcional; se deriva del nombre si se omite',
    example: 'accion',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;
}
