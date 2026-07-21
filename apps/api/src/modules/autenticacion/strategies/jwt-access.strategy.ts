import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from '@/config';
import { AccessTokenPayload } from '@/common/interfaces/token-payload.interface';

/**
 * Valida el access token (Bearer). Registra la strategy 'jwt' que usa JwtAccessGuard.
 * Devuelve el payload, que Passport adjunta como req.user.
 */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(jwtConfig.KEY) config: ConfigType<typeof jwtConfig>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessSecret,
    });
  }

  validate(payload: AccessTokenPayload): AccessTokenPayload {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Tipo de token inválido');
    }
    return payload;
  }
}
