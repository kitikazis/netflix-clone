import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/**
 * Latido de progreso: posición actual del reproductor. Se envía periódicamente
 * (p. ej. cada ~10 s) y al pausar/salir. El backend decide `completado`.
 */
export class GuardarProgresoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  contenidoId: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Presente solo en series' })
  @IsOptional()
  @IsUUID('4')
  episodioId?: string;

  @ApiProperty({ example: 132, description: 'Segundo actual de reproducción' })
  @IsInt()
  @Min(0)
  segundoActual: number;

  @ApiProperty({ example: 5400, description: 'Duración total del vídeo (segundos)' })
  @IsInt()
  @Min(1)
  duracionTotal: number;
}
