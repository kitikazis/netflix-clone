import { JwtService } from '@nestjs/jwt';
import { TokensService } from './tokens.service';
import { RolUsuario } from '@/modules/usuarios/enums/rol-usuario.enum';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '@/common/interfaces/token-payload.interface';

/**
 * Pruebas de la emisión y rotación de tokens.
 *
 * Lo que se comprueba aquí no se ve probando la aplicación a mano y es justo lo
 * que peor se rompería en silencio: que el refresh caduque solo, que rotarlo
 * invalide de verdad el anterior, que un reuso tumbe TODAS las sesiones de esa
 * cuenta —y solo esa—, y que un access y un refresh no sean intercambiables.
 * Un fallo en cualquiera de estas no da síntoma: el usuario entra tan campante
 * mientras la garantía de seguridad ya no está.
 */

/**
 * Redis de mentira con lo justo que usa el servicio: `set` con TTL, `exists`,
 * `del` de varias claves y un `scan` que pagina de verdad.
 */
class RedisFalso {
  private datos = new Map<string, { valor: string; ttl?: number }>();

  set(k: string, v: string, _modo?: string, ttl?: number): Promise<'OK'> {
    this.datos.set(k, { valor: v, ttl });
    return Promise.resolve('OK');
  }
  exists(k: string): Promise<number> {
    return Promise.resolve(this.datos.has(k) ? 1 : 0);
  }
  del(...claves: string[]): Promise<number> {
    let n = 0;
    for (const k of claves) if (this.datos.delete(k)) n++;
    return Promise.resolve(n);
  }

  /**
   * SCAN fiel: filtra por patrón `pref*` y devuelve UNA clave por tanda para
   * forzar varias vueltas, así se comprueba que el servicio agota el cursor.
   *
   * El cursor es la última clave entregada (no un índice), como el de Redis en
   * espíritu: paginar por valor y no por posición hace que borrar las claves ya
   * devueltas —justo lo que hace `revocarTodos`— no desplace ni salte las que
   * quedan. Un cursor posicional se saltaría una a cada borrado.
   */
  scan(cursor: string, _match: string, patron: string, _count: string, _n: number) {
    const prefijo = patron.replace(/\*$/, '');
    const restantes = [...this.datos.keys()]
      .filter((k) => k.startsWith(prefijo) && (cursor === '0' || k > cursor))
      .sort();
    const clave = restantes[0];
    if (clave === undefined) return Promise.resolve(['0', [] as string[]] as [string, string[]]);
    const siguiente = restantes.length > 1 ? clave : '0';
    return Promise.resolve([siguiente, [clave]] as [string, string[]]);
  }

  // Ayudas para las aserciones, no forman parte de la interfaz de Redis.
  ttlDe(k: string): number | undefined {
    return this.datos.get(k)?.ttl;
  }
  claves(): string[] {
    return [...this.datos.keys()];
  }
}

const CONFIG = {
  accessSecret: 'secreto-de-access',
  refreshSecret: 'secreto-de-refresh',
  accessTtl: '15m',
  refreshTtl: '7d',
} as const;

const DATOS = {
  sub: 'usuario-1',
  correo: 'ana@ejemplo.com',
  rol: RolUsuario.USUARIO,
};

function crear() {
  const redis = new RedisFalso();
  const jwt = new JwtService({});
  const service = new TokensService(jwt, CONFIG, redis as never);
  return { service, redis, jwt };
}

describe('TokensService', () => {
  it('registra el refresh en la allowlist con la caducidad del refresh, no la del access', async () => {
    const { service, redis, jwt } = crear();
    const { refreshToken, accessToken } = await service.generarPar(DATOS);

    const { jti } = jwt.decode<RefreshTokenPayload>(refreshToken);
    const clave = `refresh:${DATOS.sub}:${jti}`;

    expect(await service.esRefreshValido(DATOS.sub, jti)).toBe(true);
    // 7 días en segundos: si se guardara con el TTL del access (15 min), la
    // sesión moriría a los 15 minutos aunque el refresh siguiera vivo.
    expect(redis.ttlDe(clave)).toBe(7 * 86400);
    // El access no se guarda: es sin estado y se valida solo por firma.
    const access = jwt.decode<AccessTokenPayload>(accessToken);
    expect(redis.claves()).toEqual([clave]);
    expect(access.type).toBe('access');
  });

  it('marca cada token con su tipo, para que el guard no confunda uno con otro', async () => {
    const { service, jwt } = crear();
    const { accessToken, refreshToken } = await service.generarPar(DATOS);

    expect(jwt.decode<AccessTokenPayload>(accessToken).type).toBe('access');
    expect(jwt.decode<RefreshTokenPayload>(refreshToken).type).toBe('refresh');
  });

  it('firma access y refresh con secretos distintos: uno no vale por el otro', async () => {
    const { service, jwt } = crear();
    const { accessToken, refreshToken } = await service.generarPar(DATOS);

    // Un access presentado como refresh no debe verificar: si ambos usaran el
    // mismo secreto, un access robado (que viaja en cada petición) serviría
    // para renovar sesión indefinidamente.
    await expect(service.verificarRefresh(accessToken)).rejects.toBeDefined();
    // Y el refresh no verifica con el secreto del access.
    await expect(
      jwt.verifyAsync(refreshToken, { secret: CONFIG.accessSecret }),
    ).rejects.toBeDefined();
    // El refresh sí verifica con el suyo.
    await expect(service.verificarRefresh(refreshToken)).resolves.toMatchObject({
      sub: DATOS.sub,
      type: 'refresh',
    });
  });

  it('cada par lleva un jti distinto, para poder rotar sin pisar sesiones', async () => {
    const { service, jwt } = crear();
    const a = jwt.decode<RefreshTokenPayload>((await service.generarPar(DATOS)).refreshToken);
    const b = jwt.decode<RefreshTokenPayload>((await service.generarPar(DATOS)).refreshToken);
    expect(a.jti).not.toBe(b.jti);
  });

  it('al rotar, el refresh revocado deja de ser válido y el nuevo sí lo es', async () => {
    const { service, jwt } = crear();
    const viejo = jwt.decode<RefreshTokenPayload>((await service.generarPar(DATOS)).refreshToken);
    const nuevo = jwt.decode<RefreshTokenPayload>((await service.generarPar(DATOS)).refreshToken);

    await service.revocar(DATOS.sub, viejo.jti);

    expect(await service.esRefreshValido(DATOS.sub, viejo.jti)).toBe(false);
    // Revocar uno no toca a los demás: la otra sesión sigue viva.
    expect(await service.esRefreshValido(DATOS.sub, nuevo.jti)).toBe(true);
  });

  it('ante un reuso, revoca TODAS las sesiones de esa cuenta y solo esa', async () => {
    const { service, jwt } = crear();
    // Tres sesiones de la víctima y una de otra cuenta.
    const jtis: string[] = [];
    for (let i = 0; i < 3; i++) {
      const t = jwt.decode<RefreshTokenPayload>((await service.generarPar(DATOS)).refreshToken);
      jtis.push(t.jti);
    }
    const otra = { ...DATOS, sub: 'usuario-2' };
    const ajena = jwt.decode<RefreshTokenPayload>((await service.generarPar(otra)).refreshToken);

    await service.revocarTodos(DATOS.sub);

    // Todas las de la víctima caen: detectado el reuso, se cierra sesión en
    // todos sus dispositivos, no solo en el token comprometido.
    for (const jti of jtis) {
      expect(await service.esRefreshValido(DATOS.sub, jti)).toBe(false);
    }
    // La cuenta ajena no se ve afectada: el patrón del SCAN va por usuario.
    expect(await service.esRefreshValido('usuario-2', ajena.jti)).toBe(true);
  });
});
