/** Tipos del dominio, espejo de la API (apps/api). */

export type TipoContenido = 'PELICULA' | 'SERIE';

export type EstadoProcesamiento =
  | 'PENDIENTE'
  | 'EN_COLA'
  | 'PROCESANDO'
  | 'LISTO'
  | 'ERROR';

export interface Genero {
  id: string;
  nombre: string;
  slug: string;
}

export interface Episodio {
  id: string;
  temporada: number;
  numeroEpisodio: number;
  titulo: string;
  sinopsis: string | null;
  duracionMinutos: number | null;
  estadoProcesamiento: EstadoProcesamiento;
  hlsPlaylistUrl: string | null;
  duracionSegundos: number | null;
}

export interface Contenido {
  id: string;
  tipo: TipoContenido;
  titulo: string;
  slug: string;
  sinopsis: string | null;
  anioLanzamiento: number | null;
  clasificacionEdad: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  duracionMinutos: number | null;
  destacado: boolean;
  publicado: boolean;
  estadoProcesamiento: EstadoProcesamiento;
  hlsPlaylistUrl: string | null;
  duracionSegundos: number | null;
  generos?: Genero[];
  episodios?: Episodio[];
}

export interface Paginacion {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface Pagina<T> {
  datos: T[];
  paginacion: Paginacion;
}

/** Item de "continuar viendo" (respuesta de GET /continuar-viendo). */
export interface ItemContinuar {
  contenido: {
    id: string;
    slug: string;
    titulo: string;
    tipo: TipoContenido;
    posterUrl: string | null;
    backdropUrl: string | null;
    hlsPlaylistUrl: string | null;
  };
  episodio: {
    id: string;
    temporada: number;
    numeroEpisodio: number;
    titulo: string;
    hlsPlaylistUrl: string | null;
  } | null;
  segundoActual: number;
  duracionTotal: number;
  completado: boolean;
  porcentaje: number;
  actualizado: string;
}

/** Punto de reanudación de un título concreto (GET /continuar-viendo/posicion). */
export interface Posicion {
  segundoActual: number;
  duracionTotal: number;
  completado: boolean;
  porcentaje: number;
}

/** Perfil devuelto por el login/registro. */
export interface Perfil {
  id: string;
  nombre: string;
  avatarUrl: string | null;
  esInfantil: boolean;
  idioma: string;
}
