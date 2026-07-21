import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenPayload } from '../interfaces/token-payload.interface';

/**
 * Extrae el payload del access token de la request (o un campo concreto):
 *   @UsuarioActual() usuario: AccessTokenPayload
 *   @UsuarioActual('sub') usuarioId: string
 */
export const UsuarioActual = createParamDecorator(
  (campo: keyof AccessTokenPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const usuario = req.user;
    return campo ? usuario?.[campo] : usuario;
  },
);
