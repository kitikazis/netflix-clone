import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Pruebas de la subida de vídeos.
 *
 * Existen por un fallo concreto: con el driver local, la API devuelve el
 * destino como ruta relativa, y el navegador la resolvía contra el dominio del
 * FRONT en vez del de la API. Ahí no hay nada, así que toda subida terminaba en
 * un 404 que parecía del almacenamiento.
 */

vi.mock('./urls', () => ({
  API_PUBLIC_URL: 'http://api.test/api/v1',
  urlApi: (ruta: string) =>
    /^https?:\/\//.test(ruta) ? ruta : `http://api.test${ruta}`,
}));

vi.mock('./sesion', () => ({
  peticionCuenta: vi.fn(),
  tokenDeCuenta: () => 'token-de-cuenta',
}));

/**
 * XMLHttpRequest de mentira. No contesta sola: la prueba decide cuándo y con
 * qué código, porque el envío ocurre después de pedirle el destino a la API y
 * si respondiera al momento no daría tiempo a prepararlo.
 */
class XhrFalso {
  static ultima: XhrFalso | null = null;
  metodo = '';
  url = '';
  cabeceras: Record<string, string> = {};
  status = 200;
  enviada = false;
  upload = { onprogress: null as ((e: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    XhrFalso.ultima = this;
  }
  open(metodo: string, url: string) {
    this.metodo = metodo;
    this.url = url;
  }
  setRequestHeader(k: string, v: string) {
    this.cabeceras[k] = v;
  }
  send() {
    this.enviada = true;
  }
  abort() {
    this.onabort?.();
  }
  responder(status = 200) {
    this.status = status;
    this.onload?.();
  }
  progreso(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent);
  }
}

/** Espera a que la subida llegue a enviar la petición. */
async function esperarEnvio(): Promise<XhrFalso> {
  for (let i = 0; i < 50; i++) {
    if (XhrFalso.ultima?.enviada) return XhrFalso.ultima;
    await new Promise((r) => setTimeout(r, 1));
  }
  throw new Error('la subida nunca llegó a enviarse');
}

const ARCHIVO = { name: 'peli.mp4', type: 'video/mp4', size: 10 } as File;

async function importar() {
  vi.resetModules();
  return import('./subidas');
}

async function conDestino(destino: Record<string, unknown>) {
  const { peticionCuenta } = await import('./sesion');
  vi.mocked(peticionCuenta).mockResolvedValue(destino);
}

describe('subida de vídeos', () => {
  beforeEach(() => {
    XhrFalso.ultima = null;
    vi.stubGlobal('XMLHttpRequest', XhrFalso);
  });

  it('ancla al origen de la API un destino relativo (driver local)', async () => {
    await conDestino({
      clave: 'origen/abc/peli.mp4',
      url: '/api/v1/admin/subidas/directa?clave=origen%2Fabc%2Fpeli.mp4',
      metodo: 'PUT',
    });
    const { subirVideo } = await importar();

    const promesa = subirVideo(ARCHIVO, () => {});
    const xhr = await esperarEnvio();
    expect(xhr.url).toBe(
      'http://api.test/api/v1/admin/subidas/directa?clave=origen%2Fabc%2Fpeli.mp4',
    );
    xhr.responder(200);
    expect(await promesa).toBe('origen/abc/peli.mp4');
  });

  it('a la propia API le manda el token: ese endpoint está protegido', async () => {
    await conDestino({ clave: 'k', url: '/api/v1/admin/subidas/directa', metodo: 'PUT' });
    const { subirVideo } = await importar();
    const promesa = subirVideo(ARCHIVO, () => {});
    const xhr = await esperarEnvio();
    expect(xhr.cabeceras.Authorization).toBe('Bearer token-de-cuenta');
    xhr.responder(200);
    await promesa;
  });

  it('respeta tal cual una URL prefirmada y NO le añade el token', async () => {
    await conDestino({
      clave: 'origen/abc/peli.mp4',
      url: 'https://almacen.example/bucket/origen/abc/peli.mp4?X-Amz-Signature=xyz',
      metodo: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
    });
    const { subirVideo } = await importar();
    const promesa = subirVideo(ARCHIVO, () => {});
    const xhr = await esperarEnvio();

    expect(xhr.url).toBe(
      'https://almacen.example/bucket/origen/abc/peli.mp4?X-Amz-Signature=xyz',
    );
    // Dos motivos: rompería la firma y le entregaría nuestro token a un tercero.
    expect(xhr.cabeceras.Authorization).toBeUndefined();
    expect(xhr.cabeceras['Content-Type']).toBe('video/mp4');
    xhr.responder(200);
    await promesa;
  });

  it('explica un 404 según a quién se estaba subiendo', async () => {
    await conDestino({ clave: 'k', url: '/api/v1/admin/subidas/directa', metodo: 'PUT' });
    const { subirVideo } = await importar();
    const promesa = subirVideo(ARCHIVO, () => {});
    (await esperarEnvio()).responder(404);
    await expect(promesa).rejects.toThrow(/API/);

    XhrFalso.ultima = null;
    await conDestino({ clave: 'k', url: 'https://almacen.example/x', metodo: 'PUT' });
    const { subirVideo: subir2 } = await importar();
    const otra = subir2(ARCHIVO, () => {});
    (await esperarEnvio()).responder(404);
    await expect(otra).rejects.toThrow(/bucket/);
  });

  it('informa del progreso en porcentaje', async () => {
    await conDestino({ clave: 'k', url: 'https://almacen.example/x', metodo: 'PUT' });
    const { subirVideo } = await importar();
    const avances: number[] = [];
    const promesa = subirVideo(ARCHIVO, (p) => avances.push(p));
    const xhr = await esperarEnvio();
    xhr.progreso(25, 100);
    xhr.progreso(100, 100);
    xhr.responder(200);
    await promesa;
    expect(avances).toEqual([25, 100]);
  });

  it('formatea los tamaños en unidades legibles', async () => {
    const { formatearBytes } = await importar();
    expect(formatearBytes(900)).toBe('900 B');
    expect(formatearBytes(3.6 * 1024 * 1024)).toBe('3.6 MB');
    expect(formatearBytes(2 * 1024 ** 3)).toBe('2.0 GB');
  });
});
