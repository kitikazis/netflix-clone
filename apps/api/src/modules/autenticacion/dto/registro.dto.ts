import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistroDto {
  @ApiProperty({ example: 'ana@correo.com' })
  @IsEmail()
  @MaxLength(255)
  correo: string;

  // bcrypt trunca a 72 bytes: acotamos el máximo para evitar sorpresas.
  @ApiProperty({ example: 'secreto-super-seguro', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  contrasena: string;
}
