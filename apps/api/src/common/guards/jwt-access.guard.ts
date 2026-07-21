import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protege endpoints exigiendo un access token válido.
 * Resuelve la strategy 'jwt' (registrada por AutenticacionModule) de forma global,
 * por eso puede usarse en cualquier módulo sin acoplar dependencias.
 */
@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt') {}
