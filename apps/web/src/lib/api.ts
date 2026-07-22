import { cache } from 'react';
import type { Contenido, Genero, Pagina } from './tipos';
import { API_BASE_URL } from './urls';

export { API_BASE_URL, API_PUBLIC_URL, urlMedia } from './urls';

interface Envoltura<T> {
  data: T;
}

/** GET a la API (SSR) que desenvuelve el sobre `{ data }`. Lanza si no-2xx. */
async function pedir<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API ${res.status} en ${path}`);
  }
  const json = (await res.json()) as Envoltura<T>;
  return json.data;
}

/** Igual que `pedir`, pero devuelve null en 404/errores (para páginas tolerantes). */
async function pedirOpcional<T>(path: string): Promise<T | null> {
  try {
    return await pedir<T>(path);
  } catch {
    return null;
  }
}

export interface FiltrosCatalogo {
  q?: string;
  tipo?: 'PELICULA' | 'SERIE';
  generoSlug?: string;
  destacado?: boolean;
  orden?: 'RECIENTE' | 'TITULO' | 'ANIO';
  pagina?: number;
  limite?: number;
}

export function getCatalogo(filtros: FiltrosCatalogo = {}): Promise<Pagina<Contenido>> {
  const qs = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== '') qs.set(clave, String(valor));
  }
  const cola = qs.toString();
  return pedir<Pagina<Contenido>>(`/catalogo/contenido${cola ? `?${cola}` : ''}`);
}

/**
 * Ficha de un título. Memoizado por render: `generateMetadata` y la página
 * piden el mismo slug, y sin esto serían dos viajes a la API por navegación.
 */
export const getTitulo = cache(
  (slug: string): Promise<Contenido | null> =>
    pedirOpcional<Contenido>(`/catalogo/contenido/${encodeURIComponent(slug)}`),
);

/** Géneros del catálogo. Devuelve [] si la API no responde (no rompe la página). */
export const getGeneros = cache(
  (): Promise<Genero[]> => pedirOpcional<Genero[]>('/catalogo/generos').then((gs) => gs ?? []),
);

/** Igual que `getCatalogo`, pero tolerante: [] en vez de excepción. */
export async function getCatalogoOpcional(
  filtros: FiltrosCatalogo = {},
): Promise<Contenido[]> {
  try {
    return (await getCatalogo(filtros)).datos;
  } catch {
    return [];
  }
}
