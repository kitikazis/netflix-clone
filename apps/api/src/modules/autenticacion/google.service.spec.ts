import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { GoogleService } from './google.service';

/**
 * Pruebas de la verificación del token de Google.
 *
 * Lo que se comprueba aquí no se puede ver probando la aplicación a mano: que
 * un token que Google firmó de verdad, pero para OTRA aplicación, no sirva
 * para entrar. Es el fallo clásico de este flujo y no da ningún síntoma —el
 * usuario entra tan campante— hasta que alguien lo aprovecha.
 */
const verifyIdToken = jest.fn<Promise<unknown>, [unknown]>();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (opciones: unknown) => verifyIdToken(opciones),
  })),
}));

const CLIENTE = '123-abc.apps.googleusercontent.com';

function servicio() {
  return new GoogleService({ clientId: CLIENTE });
}

/** Respuesta de la librería cuando el token es aceptable. */
function ticket(payload: Record<string, unknown>) {
  return { getPayload: () => payload };
}

describe('GoogleService', () => {
  beforeEach(() => verifyIdToken.mockReset());

  it('exige que el token vaya dirigido a ESTA aplicación', async () => {
    verifyIdToken.mockResolvedValue(ticket({ email: 'ana@gmail.com', email_verified: true }));
    await servicio().verificar('tok');

    // Sin este filtro, un token emitido para cualquier otra aplicación de
    // Google —y firmado por Google, así que válido— serviría para entrar.
    expect(verifyIdToken).toHaveBeenCalledWith(expect.objectContaining({ audience: CLIENTE }));
  });

  it('devuelve el correo en minúsculas y el nombre', async () => {
    verifyIdToken.mockResolvedValue(
      ticket({ email: 'Ana.Perez@Gmail.com', email_verified: true, name: 'Ana Pérez' }),
    );
    // El correo se normaliza: si no, entrar con mayúsculas crearía una cuenta
    // distinta de la que ya existe en minúsculas.
    expect(await servicio().verificar('tok')).toEqual({
      correo: 'ana.perez@gmail.com',
      nombre: 'Ana Pérez',
    });
  });

  it('rechaza un correo que Google no ha verificado', async () => {
    verifyIdToken.mockResolvedValue(ticket({ email: 'ana@gmail.com', email_verified: false }));
    // Si no, alguien podría registrar en Google el correo de otra persona sin
    // demostrar que es suyo y entrar aquí como ella.
    await expect(servicio().verificar('tok')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un token con firma inválida', async () => {
    verifyIdToken.mockRejectedValue(new Error('Invalid token signature'));
    await expect(servicio().verificar('tok')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un token sin correo', async () => {
    verifyIdToken.mockResolvedValue(ticket({ email_verified: true }));
    await expect(servicio().verificar('tok')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sin configurar, avisa en vez de fallar de forma rara', async () => {
    // Se construye a mano: pasar `undefined` a un parámetro con valor por
    // defecto activaría ese valor y la prueba no comprobaría nada.
    const sinConfig = new GoogleService({ clientId: undefined });
    expect(sinConfig.disponible).toBe(false);
    await expect(sinConfig.verificar('tok')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
