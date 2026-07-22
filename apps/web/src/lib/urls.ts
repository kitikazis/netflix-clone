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

/** Origen de la API (sin `/api/v1`), para resolver rutas de media relativas. */
function origenApi(base: string): string {
  return base.replace(/\/api\/v\d+\/?$/, '');
}

/**
 * Resuelve la URL reproducible del HLS. En R2 `hlsPlaylistUrl` ya es absoluta;
 * en local es relativa (`/media/...`) y se ancla al origen de la API.
 */
export function urlMedia(hlsPlaylistUrl: string | null | undefined): string | null {
  if (!hlsPlaylistUrl) return null;
  if (/^https?:\/\//.test(hlsPlaylistUrl)) return hlsPlaylistUrl;
  return `${origenApi(API_PUBLIC_URL)}${hlsPlaylistUrl}`;
}
