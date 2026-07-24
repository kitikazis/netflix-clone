import { HttpException, UnauthorizedException } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

/**
 * Pruebas del código de un solo uso.
 *
 * Lo que se comprueba aquí no se ve probando la aplicación: que el código no
 * se guarde en claro, que no se pueda reventar a fuerza de intentos, que un
 * envío fallido no deje un código vivo y que pedir a ráfagas se corte. Son las
 * garantías que hacen que un código de seis dígitos sea seguro.
 */

/** Redis de mentira: un mapa con TTL simulado, suficiente para el flujo. */
class RedisFalso {
  private datos = new Map<string, string>();
  private ttls = new Map<string, number>();

  get(k: string): Promise<string | null> {
    return Promise.resolve(this.datos.get(k) ?? null);
  }
  set(k: string, v: string, _modo?: string, ttl?: number): Promise<'OK'> {
    this.datos.set(k, v);
    if (ttl) this.ttls.set(k, ttl);
    return Promise.resolve('OK');
  }
  del(k: string): Promise<number> {
    const habia = this.datos.delete(k);
    this.ttls.delete(k);
    return Promise.resolve(habia ? 1 : 0);
  }
  ttl(k: string): Promise<number> {
    return Promise.resolve(this.ttls.get(k) ?? -1);
  }
}

/** Hash trivial pero determinista: basta para distinguir códigos. */
const disfraz = (s: string) => Buffer.from(s).toString('base64');
const hash = {
  // Como bcrypt: determinista pero sin el texto legible dentro.
  hash: (t: string) => Promise.resolve(`h:${disfraz(t)}`),
  comparar: (t: string, h: string) => Promise.resolve(`h:${disfraz(t)}` === h),
};

const CFG = {
  codigoTtlMin: 5,
  esperaReenvioS: 60,
  maxIntentos: 3,
} as never;

function crear(envio: { enviarCodigo: jest.Mock; disponible: boolean }) {
  const redis = new RedisFalso();
  const service = new WhatsAppService(redis as never, envio, CFG, hash as never);
  return { service, redis };
}

const TEL = '+51999888777';

describe('WhatsAppService', () => {
  it('guarda el hash del código, nunca el código en claro', async () => {
    const envio = { enviarCodigo: jest.fn().mockResolvedValue(undefined), disponible: true };
    const { service, redis } = crear(envio);
    await service.solicitar(TEL);

    const codigoEnviado = (envio.enviarCodigo.mock.calls as string[][])[0][1];
    expect(codigoEnviado).toMatch(/^\d{6}$/);

    const guardado = JSON.parse((await redis.get('otp:wa:' + TEL))!) as { hash: string };
    // En Redis está el hash, no el número que se mandó.
    expect(guardado.hash).not.toContain(codigoEnviado);
    expect(guardado.hash).toBe('h:' + Buffer.from(codigoEnviado).toString('base64'));
  });

  it('el código correcto entra una vez y se consume', async () => {
    const envio = { enviarCodigo: jest.fn().mockResolvedValue(undefined), disponible: true };
    const { service, redis } = crear(envio);
    await service.solicitar(TEL);
    const codigo = (envio.enviarCodigo.mock.calls as string[][])[0][1];

    expect(await service.verificar(TEL, codigo)).toEqual({ telefono: TEL });
    // Ya no está: un segundo uso no vale.
    expect(await redis.get('otp:wa:' + TEL)).toBeNull();
    await expect(service.verificar(TEL, codigo)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('se invalida tras agotar los intentos', async () => {
    const envio = { enviarCodigo: jest.fn().mockResolvedValue(undefined), disponible: true };
    const { service } = crear(envio);
    await service.solicitar(TEL);

    for (let i = 0; i < 3; i++) {
      await expect(service.verificar(TEL, '000000')).rejects.toThrow('incorrecto');
    }
    // El cuarto ya no es «incorrecto» sino «demasiados intentos»: el código murió.
    await expect(service.verificar(TEL, '000000')).rejects.toThrow(/intentos/);
  });

  it('un envío fallido no deja el código vivo', async () => {
    const envio = {
      enviarCodigo: jest.fn().mockRejectedValue(new Error('Meta caído')),
      disponible: true,
    };
    const { service, redis } = crear(envio);
    await expect(service.solicitar(TEL)).rejects.toThrow();
    // No queda nada contra lo que probar suerte.
    expect(await redis.get('otp:wa:' + TEL)).toBeNull();
  });

  it('no deja pedir otro código antes de la espera', async () => {
    const envio = { enviarCodigo: jest.fn().mockResolvedValue(undefined), disponible: true };
    const { service } = crear(envio);
    await service.solicitar(TEL);
    // Segundo intento inmediato: cortado con 429.
    await expect(service.solicitar(TEL)).rejects.toBeInstanceOf(HttpException);
    expect(envio.enviarCodigo).toHaveBeenCalledTimes(1);
  });

  it('verificar sin código pedido falla', async () => {
    const envio = { enviarCodigo: jest.fn(), disponible: true };
    const { service } = crear(envio);
    await expect(service.verificar(TEL, '123456')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
