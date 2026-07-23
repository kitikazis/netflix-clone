/**
 * Ruta pública del endpoint de subida directa (driver local). Incluye el prefijo
 * global `api` y la versión `v1`; debe coincidir con SubidasController.
 */
export const RUTA_SUBIDA_DIRECTA = '/api/v1/admin/subidas/directa';

/**
 * El almacenamiento se organiza en dos ramas, y solo dos:
 *
 *   origen/2026-07-23/mi-pelicula-a1b2c3d4.mp4   ← lo que se sube, tal cual
 *   hls/mi-pelicula/master.m3u8                  ← lo que se reproduce
 *   hls/mi-serie/t1e2/master.m3u8
 *
 * Antes el HLS colgaba de una carpeta con el UUID del título, que es correcto
 * pero ilegible: al abrir el bucket no había forma de saber de qué película era
 * cada carpeta sin ir a consultar la base de datos. Se usa el slug, que ya es
 * único y descriptivo.
 */
export const PREFIJO_ORIGEN = 'origen';
export const PREFIJO_HLS = 'hls';

/**
 * Clave para un vídeo fuente recién subido.
 *
 * Se agrupa por fecha para que el listado quede ordenado por cuándo se subió, y
 * se le añade un sufijo corto porque al firmar la subida todavía no se sabe a
 * qué título irá: sin él, subir dos veces el mismo archivo se pisaría.
 */
export function construirClaveOrigen(nombreArchivo: string, sufijo: string): string {
  const dia = new Date().toISOString().slice(0, 10);
  const limpio = sanitizarNombreArchivo(nombreArchivo);
  const punto = limpio.lastIndexOf('.');
  const base = punto > 0 ? limpio.slice(0, punto) : limpio;
  const ext = punto > 0 ? limpio.slice(punto) : '';
  return `${PREFIJO_ORIGEN}/${dia}/${base}-${sufijo.slice(0, 8)}${ext}`;
}

/**
 * Sanea el nombre de archivo para usarlo como parte de una clave de objeto:
 * quita rutas, deja solo caracteres seguros y evita nombres vacíos/ocultos.
 */
export function sanitizarNombreArchivo(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? '';
  const limpio = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[.-]+/, '')
    .slice(0, 120);
  return limpio || 'video';
}
