import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenPayload } from '@/common/interfaces/token-payload.interface';

/**
 * Exige que el access token lleve un perfil seleccionado (`perfilId`), lo que
 * ocurre tras POST /auth/perfiles/:id/seleccionar. Debe ir DESPUÉS de JwtAccessGuard.
 */
@Injectable()
export class PerfilSeleccionadoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AccessTokenPayload }>();
    if (!req.user?.perfilId) {
      throw new ForbiddenException('Selecciona un perfil antes de continuar');
    }
    return true;
  }
}
