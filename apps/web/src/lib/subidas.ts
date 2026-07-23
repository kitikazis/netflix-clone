'use client';

import { peticionCuenta } from './sesion';

/**
 * Subida de vídeos fuente y encolado de la transcodificación.
 *
 * El archivo NO pasa por la API. Se pide una URL de destino, el navegador sube
 * los bytes directamente al almacenamiento y después se avisa a la API con la
 * clave resultante. Es lo único viable con el plan gratuito de Render, donde el
 * contenedor tiene 512 MB: una película de dos gigas atravesando el proceso lo
 * mataría, y además el reloj de la petición se agota mucho antes de terminar.
 */

interface DestinoSubida {
  clave: string;
  url: string;
  metodo: 'PUT';
  headers?: Record<string, string>;
  expiraEn?: number;
}

/** Vídeos que el pipeline sabe manejar. */
export const TIPOS_ACEPTADOS = 'video/mp4,video/x-matroska,video/quicktime,video/webm';

export function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const unidades = ['KB', 'MB', 'GB'];
  let valor = bytes / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  return `${valor.toFixed(valor >= 10 ? 0 : 1)} ${unidades[i]}`;
}

/**
 * Sube el archivo al almacenamiento y devuelve la clave con la que la API
 * podrá encontrarlo.
 *
 * Va con XMLHttpRequest en vez de `fetch` a propósito: `fetch` no informa del
 * progreso de subida, y en un archivo de un giga una barra parada es
 * indistinguible de algo colgado.
 */
export function subirVideo(
  archivo: File,
  alProgresar: (porcentaje: number) => void,
  senal?: AbortSignal,
): Promise<string> {
  return peticionCuenta<DestinoSubida>('/admin/subidas/firmar', {
    method: 'POST',
    body: {
      nombreArchivo: archivo.name,
      contentType: archivo.type || 'video/mp4',
    },
  }).then(
    (destino) =>
      new Promise<string>((resolver, rechazar) => {
        const xhr = new XMLHttpRequest();
        xhr.open(destino.metodo, destino.url);
        for (const [clave, valor] of Object.entries(destino.headers ?? {})) {
          xhr.setRequestHeader(clave, valor);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) alProgresar(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolver(destino.clave);
          else rechazar(new Error(`El almacenamiento rechazó la subida (${xhr.status})`));
        };

        // El navegador no cuenta por qué falló una petición entre orígenes, así
        // que aquí solo se puede decir lo que se sabe y apuntar a lo probable.
        xhr.onerror = () =>
          rechazar(
            new Error(
              'No se pudo conectar con el almacenamiento. Si es la primera subida, ' +
                'revisa que el bucket permita PUT desde este dominio (CORS).',
            ),
          );
        xhr.onabort = () => rechazar(new Error('Subida cancelada'));

        senal?.addEventListener('abort', () => xhr.abort());
        xhr.send(archivo);
      }),
  );
}

/** Encola la transcodificación de una película. Responde 202: el trabajo va aparte. */
export function encolarContenido(id: string, claveOrigen: string): Promise<unknown> {
  return peticionCuenta(`/admin/procesamiento/contenido/${id}`, {
    method: 'POST',
    body: { claveOrigen },
  });
}

/** Encola la transcodificación de un episodio. */
export function encolarEpisodio(id: string, claveOrigen: string): Promise<unknown> {
  return peticionCuenta(`/admin/procesamiento/episodios/${id}`, {
    method: 'POST',
    body: { claveOrigen },
  });
}
