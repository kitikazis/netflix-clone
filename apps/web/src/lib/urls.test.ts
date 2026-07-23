import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Pruebas de la resolución de URLs de la API.
 *
 * El caso que importa es el contenido mixto: una página servida por HTTPS que
 * llama a la API por HTTP. El navegador bloquea esas peticiones y además avisa
 * de que el sitio no es seguro, así que el usuario ve la página pero no puede
 * ni entrar ni reproducir. Como la variable se define en el panel del hosting,
 * lejos del código, nada lo detectaba.
 */

function enPagina(protocolo: 'http:' | 'https:', api: string) {
  vi.stubGlobal('window', { location: { protocol: protocolo } });
  vi.stubEnv('NEXT_PUBLIC_API_URL', api);
  vi.resetModules();
  return import('./urls');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('URLs de la API', () => {
  it('sube la API a HTTPS cuando la página va por HTTPS', async () => {
    const avisos = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { API_PUBLIC_URL } = await enPagina('https:', 'http://api.ejemplo.com/api/v1');

    expect(API_PUBLIC_URL).toBe('https://api.ejemplo.com/api/v1');
    // Se corrige, pero se avisa: el arreglo de verdad está en el despliegue.
    expect(avisos).toHaveBeenCalled();
  });

  it('deja localhost en paz aunque la página vaya por HTTPS', async () => {
    // No tiene certificado, y el navegador ya lo considera origen seguro.
    const { API_PUBLIC_URL } = await enPagina('https:', 'http://localhost:3000/api/v1');
    expect(API_PUBLIC_URL).toBe('http://localhost:3000/api/v1');
  });

  it('no toca nada si la página va por HTTP', async () => {
    const { API_PUBLIC_URL } = await enPagina('http:', 'http://api.ejemplo.com/api/v1');
    expect(API_PUBLIC_URL).toBe('http://api.ejemplo.com/api/v1');
  });

  it('respeta una API ya configurada en HTTPS', async () => {
    const { API_PUBLIC_URL } = await enPagina('https:', 'https://api.ejemplo.com/api/v1');
    expect(API_PUBLIC_URL).toBe('https://api.ejemplo.com/api/v1');
  });

  describe('rutas relativas', () => {
    it('ancla al origen de la API, no al de la página', async () => {
      const { urlApi } = await enPagina('https:', 'https://api.ejemplo.com/api/v1');
      expect(urlApi('/api/v1/admin/subidas/directa')).toBe(
        'https://api.ejemplo.com/api/v1/admin/subidas/directa',
      );
    });

    it('deja intacta una URL que ya es absoluta', async () => {
      const { urlMedia } = await enPagina('https:', 'https://api.ejemplo.com/api/v1');
      expect(urlMedia('https://almacen.example/hls/peli/master.m3u8')).toBe(
        'https://almacen.example/hls/peli/master.m3u8',
      );
    });

    it('sin vídeo devuelve null', async () => {
      const { urlMedia } = await enPagina('https:', 'https://api.ejemplo.com/api/v1');
      expect(urlMedia(null)).toBeNull();
    });
  });
});
