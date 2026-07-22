import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { jwtConfig } from '@/config';
import { REDIS_CLIENT } from '@/redis/redis.constants';
import { duracionASegundos } from '@/common/utils/duracion';
import { RolUsuario } from '@/modules/usuarios/enums/rol-usuario.enum';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '@/common/interfaces/token-payload.interface';

interface DatosAccess {
  sub: string;
  correo: string;
  rol: RolUsuario;
  perfilId?: string;
  esInfantil?: boolean;
}

export interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Emite y rota los tokens. El refresh se respalda en Redis como allowlist por `jti`
 * para permitir rotación y revocación (logout / reuse detection).
 */
@Injectable()
export class TokensService {
  private readonly accessTtlSeg: number;
  private readonly refreshTtlSeg: number;

  constructor(
    private readonly jwt: JwtService,
    @Inject(jwtConfig.KEY) private readonly config: ConfigType<typeof jwtConfig>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.accessTtlSeg = duracionASegundos(config.accessTtl);
    this.refreshTtlSeg = duracionASegundos(config.refreshTtl);
  }

  private clave(usuarioId: string, jti: string): string {
    return `refresh:${usuarioId}:${jti}`;
  }

  /** Firma solo un access token (usado también al seleccionar perfil). */
  firmarAccess(datos: DatosAccess): Promise<string> {
    const payload: AccessTokenPayload = { ...datos, type: 'access' };
    return this.jwt.signAsync(payload, {
      secret: this.config.accessSecret,
      expiresIn: this.accessTtlSeg,
    });
  }

  /** Emite un par access+refresh y registra el refresh en Redis. */
  async generarPar(datos: DatosAccess): Promise<ParDeTokens> {
    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: datos.sub, jti, type: 'refresh' };

    const [accessToken, refreshToken] = await Promise.all([
      this.firmarAccess(datos),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.refreshSecret,
        expiresIn: this.refreshTtlSeg,
      }),
    ]);

    await this.redis.set(this.clave(datos.sub, jti), '1', 'EX', this.refreshTtlSeg);
    return { accessToken, refreshToken };
  }

  verificarRefresh(token: string): Promise<RefreshTokenPayload> {
    return this.jwt.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.config.refreshSecret,
    });
  }

  async esRefreshValido(usuarioId: string, jti: string): Promise<boolean> {
    return (await this.redis.exists(this.clave(usuarioId, jti))) === 1;
  }

  async revocar(usuarioId: string, jti: string): Promise<void> {
    await this.redis.del(this.clave(usuarioId, jti));
  }

  /** Revoca todos los refresh de la cuenta (logout global / reuse detection). */
  async revocarTodos(usuarioId: string): Promise<void> {
    let cursor = '0';
    const patron = `refresh:${usuarioId}:*`;
    do {
      const [siguiente, claves] = await this.redis.scan(
        cursor,
        'MATCH',
        patron,
        'COUNT',
        100,
      );
      cursor = siguiente;
      if (claves.length > 0) {
        await this.redis.del(...claves);
      }
    } while (cursor !== '0');
  }
}
