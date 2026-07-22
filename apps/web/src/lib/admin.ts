'use client';

import { peticionCuenta } from './sesion';
import type { Contenido, Genero, Pagina, TipoContenido } from './tipos';

/**
 * Operaciones de administración del catálogo.
 *
 * Todas van con el token de CUENTA (no el de perfil): el rol ADMIN vive en la
 * cuenta, no en el perfil. La API las protege con RolesGuard, así que esto es
 * solo el cliente; ocultar los botones no autoriza nada por sí mismo.
 */

export interface DatosContenido {
  tipo: TipoContenido;
  titulo: string;
  sinopsis?: string | null;
  anioLanzamiento?: number | null;
  clasificacionEdad?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  duracionMinutos?: number | null;
  destacado?: boolean;
  publicado?: boolean;
  generoIds?: string[];
}

export interface FiltrosAdmin {
  q?: string;
  tipo?: TipoContenido;
  publicado?: boolean;
  pagina?: number;
  limite?: number;
}

/**
 * Listado de administración: a diferencia del público, incluye los títulos
 * sin publicar (el controlador no fuerza `soloPublicado`).
 */
export function listarContenido(filtros: FiltrosAdmin = {}): Promise<Pagina<Contenido>> {
  const qs = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== '') qs.set(clave, String(valor));
  }
  const cola = qs.toString();
  return peticionCuenta<Pagina<Contenido>>(`/admin/catalogo/contenido${cola ? `?${cola}` : ''}`);
}

export function obtenerContenido(id: string): Promise<Contenido> {
  return peticionCuenta<Contenido>(`/admin/catalogo/contenido/${id}`);
}

export function crearContenido(datos: DatosContenido): Promise<Contenido> {
  return peticionCuenta<Contenido>('/admin/catalogo/contenido', {
    method: 'POST',
    body: limpiar(datos),
  });
}

export function actualizarContenido(
  id: string,
  datos: Partial<DatosContenido>,
): Promise<Contenido> {
  return peticionCuenta<Contenido>(`/admin/catalogo/contenido/${id}`, {
    method: 'PATCH',
    body: limpiar(datos),
  });
}

export function eliminarContenido(id: string): Promise<void> {
  return peticionCuenta<void>(`/admin/catalogo/contenido/${id}`, { method: 'DELETE' });
}

export function listarGeneros(): Promise<Genero[]> {
  return peticionCuenta<Genero[]>('/catalogo/generos');
}

export function crearGenero(nombre: string): Promise<Genero> {
  return peticionCuenta<Genero>('/catalogo/generos', { method: 'POST', body: { nombre } });
}

export function eliminarGenero(id: string): Promise<void> {
  return peticionCuenta<void>(`/catalogo/generos/${id}`, { method: 'DELETE' });
}

/**
 * Quita las claves vacías antes de enviar.
 *
 * El ValidationPipe de la API va con `forbidNonWhitelisted` y validadores como
 * `@IsUrl` o `@IsInt`: mandar `""` en un campo opcional se rechaza con un 400,
 * mientras que omitirlo se acepta. En un formulario los campos vacíos son
 * cadenas vacías, así que hay que traducirlas a "no enviado".
 */
function limpiar<T extends object>(datos: T): Partial<T> {
  const salida: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor === '' || valor === undefined) continue;
    if (Number.isNaN(valor)) continue;
    salida[clave] = valor;
  }
  return salida as Partial<T>;
}
