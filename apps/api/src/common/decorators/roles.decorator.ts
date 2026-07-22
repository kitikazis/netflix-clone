import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '@/modules/usuarios/enums/rol-usuario.enum';

export const ROLES_KEY = 'roles';

/**
 * Marca un handler/controlador con los roles autorizados. Requiere que
 * JwtAccessGuard se ejecute antes (para poblar req.user) y RolesGuard después:
 *   @UseGuards(JwtAccessGuard, RolesGuard)
 *   @Roles(RolUsuario.ADMIN)
 */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
