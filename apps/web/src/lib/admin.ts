'use client';

import { peticionCuenta } from './sesion';
import type { Contenido, Episodio, Genero, Pagina, TipoContenido } from './tipos';

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

// ---------------------------------------------------------------------------
// Episodios de una serie
// ---------------------------------------------------------------------------

export interface DatosEpisodio {
  temporada: number;
  numeroEpisodio: number;
  titulo: string;
  sinopsis?: string | null;
  duracionMinutos?: number | null;
}

/**
 * Episodios de una serie, ordenados por la propia API.
 *
 * Va por la ruta de administración porque la pública oculta las series en
 * borrador, que son precisamente las que se están montando desde el panel.
 */
export function listarEpisodios(contenidoId: string): Promise<Episodio[]> {
  return peticionCuenta<Episodio[]>(`/admin/catalogo/contenido/${contenidoId}/episodios`);
}

export function crearEpisodio(
  contenidoId: string,
  datos: DatosEpisodio,
): Promise<Episodio> {
  return peticionCuenta<Episodio>(`/catalogo/contenido/${contenidoId}/episodios`, {
    method: 'POST',
    body: limpiar(datos),
  });
}

export function actualizarEpisodio(
  id: string,
  datos: Partial<DatosEpisodio>,
): Promise<Episodio> {
  return peticionCuenta<Episodio>(`/catalogo/episodios/${id}`, {
    method: 'PATCH',
    body: limpiar(datos),
  });
}

export function eliminarEpisodio(id: string): Promise<void> {
  return peticionCuenta<void>(`/catalogo/episodios/${id}`, { method: 'DELETE' });
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

// ---------------------------------------------------------------------------
// Cuentas y resumen de la base
// ---------------------------------------------------------------------------

export interface UsuarioAdmin {
  id: string;
  /** Uno de los dos según cómo se registró; el otro va en null. */
  correo: string | null;
  telefono: string | null;
  /** Nombre y foto solo existen si la cuenta viene de un proveedor externo. */
  nombre: string | null;
  fotoUrl: string | null;
  proveedor: 'LOCAL' | 'GOOGLE' | 'WHATSAPP';
  rol: 'USUARIO' | 'ADMIN';
  activo: boolean;
  fechaCreacion: string;
  perfiles: number;
  /** Ajustes del perfil, ahora que hay uno por cuenta. */
  esInfantil: boolean | null;
  idioma: string | null;
}

export interface Estadisticas {
  usuarios: number;
  administradores: number;
  inactivos: number;
  perfiles: number;
  contenido: number;
  publicados: number;
  peliculas: number;
  series: number;
  transcodificados: number;
  episodios: number;
  generos: number;
  progresos: number;
}

export function listarUsuarios(
  filtros: { q?: string; pagina?: number; limite?: number } = {},
): Promise<Pagina<UsuarioAdmin>> {
  const qs = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== '') qs.set(clave, String(valor));
  }
  const cola = qs.toString();
  return peticionCuenta<Pagina<UsuarioAdmin>>(`/admin/usuarios${cola ? `?${cola}` : ''}`);
}

export function actualizarUsuario(
  id: string,
  datos: { rol?: 'USUARIO' | 'ADMIN'; activo?: boolean },
): Promise<UsuarioAdmin> {
  return peticionCuenta<UsuarioAdmin>(`/admin/usuarios/${id}`, {
    method: 'PATCH',
    body: datos,
  });
}

export function eliminarUsuario(id: string): Promise<void> {
  return peticionCuenta<void>(`/admin/usuarios/${id}`, { method: 'DELETE' });
}

export function obtenerEstadisticas(): Promise<Estadisticas> {
  return peticionCuenta<Estadisticas>('/admin/estadisticas');
}

// ---------------------------------------------------------------------------
// Listados de solo lectura del resto de tablas
// ---------------------------------------------------------------------------

export interface EpisodioAdmin {
  id: string;
  temporada: number;
  numeroEpisodio: number;
  titulo: string;
  duracionMinutos: number | null;
  estadoProcesamiento: string;
  serie: string;
  serieSlug: string;
}

export interface ProgresoAdmin {
  id: string;
  segundoActual: number;
  duracionTotal: number;
  completado: boolean;
  actualizado: string;
  perfil: string;
  titulo: string;
  episodio: string | null;
}

export interface GeneroAdmin extends Genero {
  titulos: number;
}

export interface SubidaAdmin {
  id: string;
  nombreArchivo: string;
  clave: string;
  tamanoBytes: string | null;
  fechaCreacion: string;
  fechaConfirmacion: string | null;
  subidoPor: string | null;
  titulo: string | null;
  episodio: string | null;
}

export type TablaAdmin = 'episodios' | 'progreso' | 'generos' | 'subidas';

export function listarTabla<T>(
  tabla: TablaAdmin,
  filtros: { q?: string; pagina?: number; limite?: number } = {},
): Promise<Pagina<T>> {
  const qs = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== '') qs.set(clave, String(valor));
  }
  const cola = qs.toString();
  return peticionCuenta<Pagina<T>>(`/admin/tablas/${tabla}${cola ? `?${cola}` : ''}`);
}
