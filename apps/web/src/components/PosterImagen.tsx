'use client';

import Image from 'next/image';
import { useState } from 'react';

interface Props {
  src: string | null | undefined;
  alt: string;
  /** Texto que se pinta cuando no hay póster o falla la descarga. */
  respaldo: string;
  /** Ancho de referencia para `sizes` (las portadas van en rejilla estrecha). */
  sizes?: string;
  prioridad?: boolean;
}

/**
 * Póster optimizado con `next/image`. Las URLs vienen del catálogo (cualquier
 * host), así que un 404 o un dominio caído son casos normales, no excepciones:
 * al fallar se cae al título en texto en vez de dejar el icono de imagen rota.
 */
export function PosterImagen({
  src,
  alt,
  respaldo,
  sizes = '(max-width: 640px) 40vw, 160px',
  prioridad = false,
}: Props) {
  const [fallo, setFallo] = useState(false);

  if (!src || fallo) {
    return <span className="vhs-sinposter">{respaldo}</span>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className="vhs-img"
      priority={prioridad}
      onError={() => setFallo(true)}
    />
  );
}
