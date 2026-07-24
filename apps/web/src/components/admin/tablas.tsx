'use client';

import Link from 'next/link';
import { PanelTabla, type Columna } from './PanelTabla';
import type {
  EpisodioAdmin,
  GeneroAdmin,
  ProgresoAdmin,
  SubidaAdmin,
} from '@/lib/admin';
import { formatearBytes } from '@/lib/subidas';

const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });

/** mm:ss a partir de segundos, para las posiciones de reproducción. */
function reloj(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const COLUMNAS_EPISODIOS: Array<Columna<EpisodioAdmin>> = [
  {
    cabecera: 'Serie',
    celda: (e) => (
      <Link href={`/titulo/${e.serieSlug}`} className="admin-titulo">
        {e.serie}
      </Link>
    ),
  },
  {
    cabecera: 'Nº',
    celda: (e) => `T${e.temporada}·E${e.numeroEpisodio}`,
    rotulo: true,
  },
  { cabecera: 'Título', celda: (e) => e.titulo, valor: (e) => e.titulo },
  {
    cabecera: 'Duración',
    celda: (e) => (e.duracionMinutos ? `${e.duracionMinutos} min` : '—'),
    rotulo: true,
  },
  { cabecera: 'Vídeo', celda: (e) => e.estadoProcesamiento, rotulo: true },
];

const COLUMNAS_PROGRESO: Array<Columna<ProgresoAdmin>> = [
  { cabecera: 'Perfil', celda: (p) => p.perfil },
  {
    cabecera: 'Título',
    celda: (p) => (p.episodio ? `${p.titulo} — ${p.episodio}` : p.titulo),
  },
  {
    cabecera: 'Posición',
    celda: (p) => `${reloj(p.segundoActual)} / ${reloj(p.duracionTotal)}`,
    rotulo: true,
  },
  {
    cabecera: 'Estado',
    celda: (p) => (
      <span className={p.completado ? 'admin-si' : 'admin-no'}>
        {p.completado ? 'Visto' : 'En curso'}
      </span>
    ),
  },
  {
    cabecera: 'Actualizado',
    celda: (p) => fecha.format(new Date(p.actualizado)),
    rotulo: true,
  },
];

const COLUMNAS_GENEROS: Array<Columna<GeneroAdmin>> = [
  { cabecera: 'Género', celda: (g) => g.nombre },
  { cabecera: 'Slug', celda: (g) => g.slug, rotulo: true },
  {
    cabecera: 'Títulos',
    celda: (g) => (
      <Link href={`/buscar?genero=${g.slug}`} className="admin-titulo">
        {g.titulos}
      </Link>
    ),
    rotulo: true,
  },
];

export const PanelEpisodios = () => (
  <PanelTabla
    tabla="episodios"
    columnas={COLUMNAS_EPISODIOS}
    placeholderBusqueda="Buscar por episodio o serie…"
    vacio="No hay episodios: el catálogo solo tiene películas."
  />
);

export const PanelProgreso = () => (
  <PanelTabla
    tabla="progreso"
    columnas={COLUMNAS_PROGRESO}
    vacio="Nadie ha empezado a ver nada todavía."
  />
);

export const PanelGeneros = () => (
  <PanelTabla tabla="generos" columnas={COLUMNAS_GENEROS} vacio="No hay géneros." />
);

const COLUMNAS_SUBIDAS: Array<Columna<SubidaAdmin>> = [
  { cabecera: 'Archivo', celda: (s) => s.nombreArchivo, valor: (s) => s.nombreArchivo },
  {
    cabecera: 'Tamaño',
    celda: (s) => (s.tamanoBytes ? formatearBytes(Number(s.tamanoBytes)) : '—'),
    // Por bytes, no por el texto: «904 KB» y «28 MB» no se ordenan alfabéticamente.
    valor: (s) => (s.tamanoBytes ? Number(s.tamanoBytes) : null),
    rotulo: true,
  },
  {
    cabecera: 'Lo subió',
    celda: (s) => s.subidoPor ?? '(cuenta borrada)',
    valor: (s) => s.subidoPor,
  },
  {
    cabecera: 'Usado en',
    celda: (s) =>
      s.titulo ? (s.episodio ? `${s.titulo} · ${s.episodio}` : s.titulo) : 'Sin asignar',
  },
  {
    cabecera: 'Subido',
    celda: (s) => fecha.format(new Date(s.fechaCreacion)),
    // Por la fecha real: «23 jul» ordenado como texto pone abril antes que enero.
    valor: (s) => s.fechaCreacion,
    rotulo: true,
  },
  {
    // Sin confirmar significa que se pidió el destino pero los bytes nunca
    // llegaron: una subida que se cortó a medias.
    cabecera: 'Estado',
    celda: (s) => (s.fechaConfirmacion ? 'Guardado' : 'Sin confirmar'),
    rotulo: true,
  },
];

export const PanelSubidas = () => (
  <PanelTabla
    tabla="subidas"
    columnas={COLUMNAS_SUBIDAS}
    placeholderBusqueda="Buscar por archivo, cuenta o título…"
    vacio="Todavía no se ha subido ningún vídeo."
  />
);
