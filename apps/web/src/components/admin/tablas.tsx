'use client';

import Link from 'next/link';
import { PanelTabla, type Columna } from './PanelTabla';
import type {
  EpisodioAdmin,
  GeneroAdmin,
  PerfilAdmin,
  ProgresoAdmin,
} from '@/lib/admin';

const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });

/** mm:ss a partir de segundos, para las posiciones de reproducción. */
function reloj(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const COLUMNAS_PERFILES: Array<Columna<PerfilAdmin>> = [
  { cabecera: 'Perfil', celda: (p) => p.nombre },
  { cabecera: 'Cuenta', celda: (p) => p.cuenta },
  { cabecera: 'Infantil', celda: (p) => (p.esInfantil ? 'Sí' : '—'), rotulo: true },
  { cabecera: 'Idioma', celda: (p) => p.idioma, rotulo: true },
  {
    cabecera: 'Alta',
    celda: (p) => fecha.format(new Date(p.fechaCreacion)),
    rotulo: true,
  },
];

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
  { cabecera: 'Título', celda: (e) => e.titulo },
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

export const PanelPerfiles = () => (
  <PanelTabla
    tabla="perfiles"
    columnas={COLUMNAS_PERFILES}
    placeholderBusqueda="Buscar por perfil o cuenta…"
    vacio="Todavía no hay perfiles."
  />
);

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
