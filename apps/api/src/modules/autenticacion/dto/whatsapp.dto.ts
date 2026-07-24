import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

/** Deja el teléfono en formato internacional: un «+» y solo dígitos detrás. */
function normalizarTelefono(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  const limpio = valor.replace(/[^\d+]/g, '');
  const conMas = limpio.startsWith('+') ? limpio : `+${limpio}`;
  return '+' + conMas.slice(1).replace(/\+/g, '');
}

export class SolicitarWhatsAppDto {
  @ApiProperty({ example: '+51999888777' })
  @Transform(({ value }) => normalizarTelefono(value))
  @IsString()
  // E.164: entre 8 y 15 dígitos tras el «+».
  @Matches(/^\+\d{8,15}$/, { message: 'El teléfono debe ir con prefijo internacional' })
  telefono: string;
}

export class VerificarWhatsAppDto extends SolicitarWhatsAppDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'El código tiene 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'El código son 6 dígitos' })
  codigo: string;
}
