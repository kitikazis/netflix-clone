import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * Consulta del punto de reanudación de un título/episodio concreto.
 * El reproductor la usa al montar, en vez de descargar toda la lista de
 * "continuar viendo" y buscar dentro (que además excluye los completados).
 */
export class ConsultarPosicionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  contenidoId: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Presente solo en series' })
  @IsOptional()
  @IsUUID('4')
  episodioId?: string;
}
