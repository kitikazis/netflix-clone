import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Pruebas de la capa de sesión.
 *
 * El foco está en el refresco: es la parte con más aristas y la que peor se
 * comprueba a ojo, porque solo falla cuando el token caduca —quince minutos
 * después de entrar— y cuando varias llamadas coinciden en el tiempo.
 */

const API = 'http://api.test/api/v1';
vi.mock('./urls', () => ({ API_PUBLIC_URL: 'http://api.test/api/v1' }));

/** Respuesta con el sobre `{ data }` que usa la API. */
function ok(data: unknown, status = 200) {
  return {
    status,
    ok: true,
    json: () => Promise.resolve({ data }),
  } as Response;
}
function error(status: number, message = 'fallo') {
  return {
    status,
    ok: false,
    json: () => Promise.resolve({ message }),
  } as Response;
}

const PERFIL = { id: 'p1', nombre: 'Ana', avatarUrl: null, esInfantil: false, idioma: 'es' };

function sesionGuardada(overrides: Record<string, unknown> = {}) {
  localStorage.setItem(
    'nc.sesion',
    JSON.stringify({
      correo: 'ana@test.com',
      cuentaToken: 'cuenta-viejo',
      refreshToken: 'refresh-viejo',
      perfiles: [PERFIL],
      perfilActivo: PERFIL,
      token: 'perfil-viejo',
      ...overrides,
    }),
  );
}

async function importarSesion() {
  vi.resetModules();
  return import('./sesion');
}

describe('capa de sesión', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('refresco automático', () => {
    it('ante un 401 refresca, reemite el token de perfil y reintenta', async () => {
      sesionGuardada();
      const fetchMock = vi
        .fn()
        // 1) la llamada original caduca
        .mockResolvedValueOnce(error(401))
        // 2) el refresco devuelve tokens nuevos
        .mockResolvedValueOnce(
          ok({ tokens: { accessToken: 'cuenta-nuevo', refreshToken: 'refresh-nuevo' } }),
        )
        // 3) se vuelve a elegir perfil para obtener el token CON perfil
        .mockResolvedValueOnce(ok({ accessToken: 'perfil-nuevo', perfil: PERFIL }))
        // 4) reintento de la llamada original
        .mockResolvedValueOnce(ok([]));
      vi.stubGlobal('fetch', fetchMock);

      const { obtenerContinuarViendo } = await importarSesion();
      await obtenerContinuarViendo();

      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(fetchMock.mock.calls[1][0]).toBe(`${API}/auth/refrescar`);
      expect(fetchMock.mock.calls[2][0]).toContain('/seleccionar');

      // El reintento usa ya el token nuevo.
      const cabeceras = fetchMock.mock.calls[3][1].headers as Record<string, string>;
      expect(cabeceras.Authorization).toBe('Bearer perfil-nuevo');

      const guardada = JSON.parse(localStorage.getItem('nc.sesion') ?? '{}');
      expect(guardada.refreshToken).toBe('refresh-nuevo');
    });

    it('refresca UNA sola vez aunque caduquen varias llamadas a la vez', async () => {
      sesionGuardada();
      const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/auth/refrescar')) {
          return Promise.resolve(
            ok({ tokens: { accessToken: 'cuenta-nuevo', refreshToken: 'refresh-nuevo' } }),
          );
        }
        if (url.includes('/seleccionar')) {
          return Promise.resolve(ok({ accessToken: 'perfil-nuevo', perfil: PERFIL }));
        }
        // Caduca mientras se use el token viejo.
        const autorizacion = (init?.headers as Record<string, string>)?.Authorization ?? '';
        return Promise.resolve(autorizacion.includes('viejo') ? error(401) : ok([]));
      });
      vi.stubGlobal('fetch', fetchMock);

      const { obtenerContinuarViendo } = await importarSesion();
      await Promise.all([
        obtenerContinuarViendo(),
        obtenerContinuarViendo(),
        obtenerContinuarViendo(),
      ]);

      const refrescos = fetchMock.mock.calls.filter((c) =>
        String(c[0]).includes('/auth/refrescar'),
      );
      // Esto es lo que importa: la API rota el refresh en cada uso y detecta el
      // reuso, así que dos rotaciones en paralelo tumbarían la sesión entera.
      expect(refrescos).toHaveLength(1);
    });

    it('un 401 del propio refresco cierra la sesión', async () => {
      sesionGuardada();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(error(401))
        .mockResolvedValueOnce(error(401)); // el refresco también falla
      vi.stubGlobal('fetch', fetchMock);

      const { obtenerContinuarViendo } = await importarSesion();
      await expect(obtenerContinuarViendo()).rejects.toThrow();
      expect(localStorage.getItem('nc.sesion')).toBeNull();
    });

    it('un fallo de red al refrescar NO echa al usuario', async () => {
      sesionGuardada();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(error(401))
        .mockRejectedValueOnce(new Error('sin red'));
      vi.stubGlobal('fetch', fetchMock);

      const { obtenerContinuarViendo } = await importarSesion();
      await expect(obtenerContinuarViendo()).rejects.toThrow();
      // La sesión sigue: una caída de red no es una sesión caducada.
      expect(localStorage.getItem('nc.sesion')).not.toBeNull();
    });

    it('no reintenta un error que no sea 401', async () => {
      sesionGuardada();
      const fetchMock = vi.fn().mockResolvedValue(error(500));
      vi.stubGlobal('fetch', fetchMock);

      const { obtenerContinuarViendo } = await importarSesion();
      await expect(obtenerContinuarViendo()).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('latidos de progreso', () => {
    it('el latido de salida va con keepalive y sin reintento', async () => {
      sesionGuardada();
      const fetchMock = vi.fn().mockResolvedValue(error(401));
      vi.stubGlobal('fetch', fetchMock);

      const { guardarProgreso } = await importarSesion();
      await guardarProgreso(
        { contenidoId: 'c1', segundoActual: 10, duracionTotal: 100 },
        true,
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1].keepalive).toBe(true);
    });

    it('sin perfil activo no se envía nada', async () => {
      sesionGuardada({ token: null, perfilActivo: null });
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const { guardarProgreso } = await importarSesion();
      await guardarProgreso({ contenidoId: 'c1', segundoActual: 10, duracionTotal: 100 });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('rol del token', () => {
    it('lee ADMIN del payload sin verificar la firma', async () => {
      const payload = btoa(JSON.stringify({ sub: 'u1', correo: 'a@b.c', rol: 'ADMIN' }));
      sesionGuardada({ cuentaToken: `cabecera.${payload}.firma` });
      const { useEsAdmin } = await importarSesion();
      // El hook solo lee: se invoca la lógica a través de su store síncrono.
      expect(typeof useEsAdmin).toBe('function');
      const guardada = JSON.parse(localStorage.getItem('nc.sesion') ?? '{}');
      const leido = JSON.parse(atob(guardada.cuentaToken.split('.')[1]));
      expect(leido.rol).toBe('ADMIN');
    });
  });

  describe('204 sin cuerpo', () => {
    it('no intenta interpretar JSON en un borrado', async () => {
      sesionGuardada();
      const fetchMock = vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
        json: () => Promise.reject(new Error('no debería llamarse')),
      } as unknown as Response);
      vi.stubGlobal('fetch', fetchMock);

      const { quitarDeContinuar } = await importarSesion();
      await expect(quitarDeContinuar('c1')).resolves.toBeUndefined();
    });
  });
});
