/**
 * Iconos del panel.
 *
 * Van dibujados como SVG y no como caracteres tipográficos (◫ ▤ ◔ …) porque
 * esos dependen de las fuentes que tenga instaladas cada sistema: lo que aquí
 * es un cuadrado partido, en otro ordenador es un rectángulo vacío o el símbolo
 * de carácter desconocido. Además no se pueden alinear con precisión.
 *
 * Todos comparten rejilla de 24, trazo de 1,7 y `currentColor`, así que heredan
 * el color del enlace —incluido el rojo cuando la sección está activa— y
 * cambian solos con el modo claro y oscuro.
 */

type Props = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Resumen: los recuadros de las cifras. */
export const IconoResumen = (p: Props) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

/** Catálogo: una claqueta de cine. */
export const IconoCatalogo = (p: Props) => (
  <svg {...base} {...p}>
    <rect x="3" y="7" width="18" height="14" rx="2" />
    <path d="M3 11h18M7.5 7l2 4M13 7l2 4" />
  </svg>
);

/** Episodios: una lista numerada. */
export const IconoEpisodios = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </svg>
);

/** Subidas: flecha hacia una bandeja. */
export const IconoSubidas = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
    <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
  </svg>
);

/** Géneros: etiqueta. */
export const IconoGeneros = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M3.5 12.5 11 5h8v8l-7.5 7.5a1.5 1.5 0 0 1-2.1 0l-5.9-5.9a1.5 1.5 0 0 1 0-2.1Z" />
    <circle cx="15.5" cy="8.5" r="1.2" />
  </svg>
);

/** Cuentas: personas. */
export const IconoCuentas = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.8c2 .7 3.5 2.5 3.5 5.2" />
  </svg>
);

/** Progreso: reproducción con avance. */
export const IconoProgreso = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5l6 3.5-6 3.5V8.5Z" />
  </svg>
);
