import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ana@correo.com' })
  @IsEmail()
  correo: string;

  @ApiProperty({ example: 'secreto-super-seguro' })
  @IsString()
  @IsNotEmpty()
  contrasena: string;
}
