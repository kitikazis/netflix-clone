/**
 * URLs de la API. Este módulo lo comparten servidor y navegador, así que no
 * puede importar nada exclusivo de uno de los dos (ver `lib/api.ts`).
 */

/**
 * URL base de la API para el SERVIDOR (SSR): el server de Next llama a la API
 * por su URL interna. Configurable vía env para prod.
 */
export const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

/**
 * URL base para el NAVEGADOR (fetch desde el cliente). Debe ser alcanzable desde
 * el browser; por eso NEXT_PUBLIC_*. Por defecto, el mismo host de dev.
 */
export const API_PUBLIC_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

/** Origen de la API (sin `/api/v1`), para resolver rutas relativas que devuelve. */
function origenApi(base: string): string {
  return base.replace(/\/api\/v\d+\/?$/, '');
}

/**
 * Ancla al origen de la API una ruta que ella misma ha devuelto.
 *
 * La API responde con rutas relativas en varios sitios (el HLS del driver
 * local, el destino de una subida directa). Si el navegador las usa tal cual,
 * las resuelve contra el dominio del FRONT, que es otro: ahí no hay nada y
 * devuelve 404.
 */
export function urlApi(ruta: string): string {
  if (/^https?:\/\//.test(ruta)) return ruta;
  return `${origenApi(API_PUBLIC_URL)}${ruta}`;
}

/**
 * Resuelve la URL reproducible del HLS. En R2 `hlsPlaylistUrl` ya es absoluta;
 * en local es relativa (`/media/...`) y se ancla al origen de la API.
 */
export function urlMedia(hlsPlaylistUrl: string | null | undefined): string | null {
  if (!hlsPlaylistUrl) return null;
  return urlApi(hlsPlaylistUrl);
}
