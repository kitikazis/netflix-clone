import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { RolUsuario } from '../enums/rol-usuario.enum';

/** Cambios que un administrador puede hacer sobre una cuenta ajena. */
export class ActualizarUsuarioDto {
  @ApiPropertyOptional({ enum: RolUsuario })
  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @ApiPropertyOptional({ description: 'Una cuenta inactiva no puede iniciar sesión' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
