'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Frontera de error de la app. Cubre los fallos de render y los de la carga de
 * datos en SSR (la API caída, por ejemplo), que antes acababan en la pantalla
 * de error genérica de Next.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="estado-pagina">
      <div className="estado-panel">
        <div className="estado-glitch">░▒▓ ERROR DE CINTA ▓▒░</div>
        <p className="estado-txt">
          Algo se ha enredado al cargar esta pantalla.
          {error.digest && (
            <>
              <br />
              <code className="estado-codigo">REF {error.digest}</code>
            </>
          )}
        </p>
        <div className="estado-acciones">
          <button type="button" className="btn btn-play" onClick={reset}>
            ↻ REINTENTAR
          </button>
          <Link href="/" className="btn btn-fantasma">
            ◀◀ VOLVER AL CATÁLOGO
          </Link>
        </div>
      </div>
    </div>
  );
}
