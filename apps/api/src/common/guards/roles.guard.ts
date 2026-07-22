import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RolUsuario } from '@/modules/usuarios/enums/rol-usuario.enum';
import { AccessTokenPayload } from '@/common/interfaces/token-payload.interface';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';

/**
 * Autoriza por rol. Debe ejecutarse DESPUÉS de JwtAccessGuard (que puebla req.user):
 *   @UseGuards(JwtAccessGuard, RolesGuard)
 * Si el handler no declara @Roles, deja pasar (solo exige estar autenticado).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<RolUsuario[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requeridos || requeridos.length === 0) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AccessTokenPayload }>();
    const rol = req.user?.rol;

    if (!rol || !requeridos.includes(rol)) {
      throw new ForbiddenException('No tienes permisos para esta operación');
    }
    return true;
  }
}
