/**
 * Ruta pública del endpoint de subida directa (driver local). Incluye el prefijo
 * global `api` y la versión `v1`; debe coincidir con SubidasController.
 */
export const RUTA_SUBIDA_DIRECTA = '/api/v1/admin/subidas/directa';

// Prefijo bajo el que se guardan los vídeos fuente (tanto en local como en R2).
export const PREFIJO_ORIGEN = 'origen';

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
