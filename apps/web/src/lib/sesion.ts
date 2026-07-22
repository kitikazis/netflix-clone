'use client';

import { useSyncExternalStore } from 'react';
import { API_PUBLIC_URL } from './urls';
import type { ItemContinuar, Perfil, Posicion } from './tipos';

const CLAVE = 'nc.sesion';

/** Sesión del navegador (persistida en localStorage). */
export interface Sesion {
  correo: string;
  cuentaToken: string; // access token de cuenta (para seleccionar perfil)
  refreshToken: string;
  perfiles: Perfil[];
  perfilActivo: Perfil | null;
  token: string | null; // access token CON perfil (para llamadas por-perfil)
}

let cache: Sesion | null | undefined;
const oyentes = new Set<() => void>();

function leer(): Sesion | null {
  if (typeof window === 'undefined') return null;
  if (cache !== undefined) return cache;
  try {
    const raw = localStorage.getItem(CLAVE);
    cache = raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    cache = null;
  }
  return cache;
}

function escribir(sesion: Sesion | null): void {
  cache = sesion;
  if (typeof window !== 'undefined') {
    if (sesion) localStorage.setItem(CLAVE, JSON.stringify(sesion));
    else localStorage.removeItem(CLAVE);
  }
  oyentes.forEach((cb) => cb());
}

function suscribir(cb: () => void): () => void {
  oyentes.add(cb);
  return () => oyentes.delete(cb);
}

// Entrar o salir en otra pestaña invalida la caché de esta.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== CLAVE) return;
    cache = undefined;
    oyentes.forEach((cb) => cb());
  });
}

/** Hook reactivo: re-renderiza al cambiar la sesión (login, perfil, logout). */
export function useSesion(): Sesion | null {
  return useSyncExternalStore(suscribir, leer, () => null);
}

interface PayloadToken {
  sub: string;
  correo: string;
  rol: 'USUARIO' | 'ADMIN';
  perfilId?: string;
}

/**
 * Lee el contenido del access token SIN verificar la firma.
 *
 * Sirve solo para decidir qué enseñar en la interfaz. La autorización de verdad
 * la hace la API en cada petición (JwtAccessGuard + RolesGuard): manipular esto
 * en el navegador cambia lo que se ve, no lo que se puede hacer.
 */
function leerPayload(token: string | null | undefined): PayloadToken | null {
  if (!token) return null;
  try {
    const cuerpo = token.split('.')[1];
    if (!cuerpo) return null;
    const json = atob(cuerpo.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as PayloadToken;
  } catch {
    return null;
  }
}

/** True si la cuenta tiene rol ADMIN. Solo para mostrar u ocultar la interfaz. */
export function useEsAdmin(): boolean {
  const sesion = useSesion();
  return leerPayload(sesion?.cuentaToken)?.rol === 'ADMIN';
}

// ---------------------------------------------------------------------------
// Capa HTTP
// ---------------------------------------------------------------------------

interface CuerpoError {
  message?: string | string[];
  error?: string;
}

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

/** Ámbito de autorización que necesita una llamada. */
type Ambito = 'ninguno' | 'cuenta' | 'perfil';

interface Opciones {
  method?: string;
  body?: unknown;
  ambito?: Ambito;
  /** Mantiene la petición viva aunque la página se esté descargando. */
  keepalive?: boolean;
}

/** Una sola petición, sin lógica de refresco. */
async function crudo<T>(path: string, opciones: Opciones & { token?: string }): Promise<T> {
  const res = await fetch(`${API_PUBLIC_URL}${path}`, {
    method: opciones.method ?? 'GET',
    headers: {
      ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
    },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
    keepalive: opciones.keepalive,
  });

  // 204 (borrados) no trae cuerpo.
  if (res.status === 204) return undefined as T;

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (json ?? {}) as CuerpoError;
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new ErrorApi(res.status, msg || err.error || `Error ${res.status}`);
  }
  return (json as { data: T }).data;
}

function tokenDe(ambito: Ambito, sesion: Sesion | null): string | null {
  if (ambito === 'ninguno') return null;
  if (!sesion) return null;
  return ambito === 'perfil' ? sesion.token : sesion.cuentaToken;
}

/**
 * Refresco en vuelo, compartido. Sin esto, las llamadas que caducan a la vez
 * (los latidos del reproductor y la fila "continuar viendo", por ejemplo)
 * dispararían varias rotaciones de refresh token en paralelo; como la API
 * revoca el anterior en cada rotación, la segunda se leería como reuso y
 * tumbaría la sesión entera.
 */
let refrescoEnVuelo: Promise<Sesion | null> | null = null;

function refrescarSesion(): Promise<Sesion | null> {
  refrescoEnVuelo ??= ejecutarRefresco().finally(() => {
    refrescoEnVuelo = null;
  });
  return refrescoEnVuelo;
}

async function ejecutarRefresco(): Promise<Sesion | null> {
  const sesion = leer();
  if (!sesion) return null;

  try {
    const { tokens } = await crudo<{ tokens: ParTokens }>('/auth/refrescar', {
      method: 'POST',
      body: { refreshToken: sesion.refreshToken },
    });

    let renovada: Sesion = {
      ...sesion,
      cuentaToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    // El refresco devuelve un token de CUENTA. Si había un perfil elegido hay
    // que volver a emitir el token CON perfil, que es el que exige la API de
    // progreso (PerfilSeleccionadoGuard).
    if (sesion.perfilActivo) {
      const data = await crudo<{ accessToken: string; perfil: Perfil }>(
        `/auth/perfiles/${sesion.perfilActivo.id}/seleccionar`,
        { method: 'POST', token: tokens.accessToken },
      );
      renovada = { ...renovada, perfilActivo: data.perfil, token: data.accessToken };
    }

    escribir(renovada);
    return renovada;
  } catch (err) {
    // Un 401 aquí significa refresh revocado o caducado: la sesión murió de
    // verdad. Un fallo de red, en cambio, no debe echar al usuario.
    if (err instanceof ErrorApi && err.estado === 401) escribir(null);
    return null;
  }
}

/** Petición autenticada: ante un 401 refresca una vez y reintenta. */
async function api<T>(path: string, opciones: Opciones = {}): Promise<T> {
  const ambito = opciones.ambito ?? 'ninguno';
  const token = tokenDe(ambito, leer());

  if (ambito !== 'ninguno' && !token) {
    throw new ErrorApi(401, 'No hay sesión iniciada');
  }

  try {
    return await crudo<T>(path, { ...opciones, token: token ?? undefined });
  } catch (err) {
    if (!(err instanceof ErrorApi) || err.estado !== 401 || ambito === 'ninguno') {
      throw err;
    }
    const renovada = await refrescarSesion();
    const nuevo = tokenDe(ambito, renovada);
    if (!nuevo) throw err;
    return crudo<T>(path, { ...opciones, token: nuevo });
  }
}

/**
 * Petición autenticada con el token de CUENTA, reutilizable desde otros
 * módulos (p. ej. la administración del catálogo). Hereda el refresco
 * automático y el reintento ante 401.
 */
export function peticionCuenta<T>(
  path: string,
  opciones: Omit<Opciones, 'ambito'> = {},
): Promise<T> {
  return api<T>(path, { ...opciones, ambito: 'cuenta' });
}

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------

interface ParTokens {
  accessToken: string;
  refreshToken: string;
}

interface RespuestaLogin {
  usuario: { id: string; correo: string };
  perfiles: Perfil[];
  tokens: ParTokens;
}

function guardarSesion(data: RespuestaLogin): Perfil[] {
  escribir({
    correo: data.usuario.correo,
    cuentaToken: data.tokens.accessToken,
    refreshToken: data.tokens.refreshToken,
    perfiles: data.perfiles,
    perfilActivo: null,
    token: null,
  });
  return data.perfiles;
}

/** Inicia sesión de cuenta; deja los perfiles listos para elegir. */
export async function iniciarSesion(correo: string, contrasena: string): Promise<Perfil[]> {
  const data = await api<RespuestaLogin>('/auth/login', {
    method: 'POST',
    body: { correo, contrasena },
  });
  return guardarSesion(data);
}

/** Crea una cuenta (con un perfil por defecto) y deja la sesión iniciada. */
export async function registrar(correo: string, contrasena: string): Promise<Perfil[]> {
  const data = await api<RespuestaLogin>('/auth/registro', {
    method: 'POST',
    body: { correo, contrasena },
  });
  return guardarSesion(data);
}

export async function cerrarSesion(): Promise<void> {
  const sesion = leer();
  escribir(null);
  if (!sesion) return;
  // Revoca el refresh en el servidor; si falla, la sesión local ya está limpia.
  await crudo('/auth/logout', {
    method: 'POST',
    body: { refreshToken: sesion.refreshToken },
  }).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Perfiles
// ---------------------------------------------------------------------------

/** Selecciona un perfil y emite el token con perfil (para progreso). */
export async function seleccionarPerfil(perfilId: string): Promise<Perfil> {
  const sesion = leer();
  if (!sesion) throw new ErrorApi(401, 'No hay sesión iniciada');
  const data = await api<{ accessToken: string; perfil: Perfil }>(
    `/auth/perfiles/${perfilId}/seleccionar`,
    { method: 'POST', ambito: 'cuenta' },
  );
  // Se relee: el refresco automático puede haber reescrito la sesión entretanto.
  const actual = leer();
  if (!actual) throw new ErrorApi(401, 'Sesión caducada');
  escribir({ ...actual, perfilActivo: data.perfil, token: data.accessToken });
  return data.perfil;
}

/** Vuelve a "¿quién está viendo?" sin cerrar la sesión de cuenta. */
export function salirDelPerfil(): void {
  const sesion = leer();
  if (!sesion) return;
  escribir({ ...sesion, perfilActivo: null, token: null });
}

/** Relee los perfiles del servidor y los sincroniza en la sesión local. */
export async function listarPerfiles(): Promise<Perfil[]> {
  const perfiles = await api<Perfil[]>('/perfiles', { ambito: 'cuenta' });
  const sesion = leer();
  if (sesion) escribir({ ...sesion, perfiles });
  return perfiles;
}

export async function crearPerfil(datos: {
  nombre: string;
  esInfantil?: boolean;
}): Promise<Perfil> {
  const perfil = await api<Perfil>('/perfiles', {
    method: 'POST',
    ambito: 'cuenta',
    body: datos,
  });
  const sesion = leer();
  if (sesion) escribir({ ...sesion, perfiles: [...sesion.perfiles, perfil] });
  return perfil;
}

export async function eliminarPerfil(perfilId: string): Promise<void> {
  await api<void>(`/perfiles/${perfilId}`, { method: 'DELETE', ambito: 'cuenta' });
  const sesion = leer();
  if (!sesion) return;
  const perfiles = sesion.perfiles.filter((p) => p.id !== perfilId);
  const borradoElActivo = sesion.perfilActivo?.id === perfilId;
  escribir({
    ...sesion,
    perfiles,
    perfilActivo: borradoElActivo ? null : sesion.perfilActivo,
    token: borradoElActivo ? null : sesion.token,
  });
}

// ---------------------------------------------------------------------------
// Progreso de visualización
// ---------------------------------------------------------------------------

export interface LatidoProgreso {
  contenidoId: string;
  episodioId?: string;
  segundoActual: number;
  duracionTotal: number;
}

/**
 * Envía un latido de progreso. Silencioso si no hay perfil activo.
 * `alSalir` marca los latidos disparados mientras la página se descarga: van
 * con `keepalive` para que el navegador no los aborte, y sin reintento (no
 * habría tiempo de completar un refresco).
 */
export async function guardarProgreso(
  latido: LatidoProgreso,
  alSalir = false,
): Promise<void> {
  const sesion = leer();
  if (!sesion?.token) return;

  if (alSalir) {
    await crudo('/continuar-viendo', {
      method: 'PUT',
      token: sesion.token,
      body: latido,
      keepalive: true,
    }).catch(() => undefined);
    return;
  }

  await api('/continuar-viendo', { method: 'PUT', ambito: 'perfil', body: latido });
}

export async function obtenerContinuarViendo(): Promise<ItemContinuar[]> {
  if (!leer()?.token) return [];
  return api<ItemContinuar[]>('/continuar-viendo', { ambito: 'perfil' });
}

/** Punto de reanudación de un título/episodio concreto (null si nunca se vio). */
export async function obtenerPosicion(
  contenidoId: string,
  episodioId?: string,
): Promise<Posicion | null> {
  if (!leer()?.token) return null;
  const qs = new URLSearchParams({ contenidoId });
  if (episodioId) qs.set('episodioId', episodioId);
  return api<Posicion | null>(`/continuar-viendo/posicion?${qs.toString()}`, {
    ambito: 'perfil',
  });
}

/** Quita un título (o un episodio) de "continuar viendo". */
export async function quitarDeContinuar(
  contenidoId: string,
  episodioId?: string,
): Promise<void> {
  const qs = episodioId ? `?episodioId=${encodeURIComponent(episodioId)}` : '';
  await api<void>(`/continuar-viendo/${contenidoId}${qs}`, {
    method: 'DELETE',
    ambito: 'perfil',
  });
}
