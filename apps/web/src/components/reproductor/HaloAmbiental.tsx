'use client';

import { useEffect, useRef } from 'react';

/** Cada cuánto se refresca el halo. Más a menudo no se nota y gasta batería. */
const INTERVALO_MS = 220;

interface Props {
  video: HTMLVideoElement | null;
}

/**
 * Iluminación cinematográfica: proyecta detrás del vídeo una versión
 * desenfocada y ampliada de la propia imagen, de modo que el color se derrama
 * hacia los bordes.
 *
 * El lienzo se dibuja diminuto (32×18) y se escala con CSS: el desenfoque sale
 * gratis del propio escalado, en vez de aplicar un filtro caro a cada
 * fotograma. Solo se refresca ~4 veces por segundo, que basta para seguir los
 * cambios de plano.
 *
 * Con hls.js el vídeo se alimenta por MSE y su `src` es un blob del mismo
 * origen, así que dibujarlo en el lienzo no lo contamina. (Con un `src`
 * remoto directo sí lo haría, pero solo impediría *leer* los píxeles, no
 * mostrarlos.)
 */
export function HaloAmbiental({ video }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!video || !lienzo.current) return;
    const ctx = lienzo.current.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    let vivo = true;
    let temporizador: number | null = null;

    const pintar = () => {
      if (!vivo) return;
      // Sin fotograma útil todavía: se reintenta más tarde.
      if (video.readyState >= 2 && !video.paused) {
        try {
          ctx.drawImage(video, 0, 0, 32, 18);
        } catch {
          // Origen no permitido: se abandona en silencio, es decorativo.
          vivo = false;
          return;
        }
      }
      temporizador = window.setTimeout(pintar, INTERVALO_MS);
    };

    pintar();
    return () => {
      vivo = false;
      if (temporizador) window.clearTimeout(temporizador);
    };
  }, [video]);

  return <canvas ref={lienzo} width={32} height={18} className="rep-halo" aria-hidden />;
}
