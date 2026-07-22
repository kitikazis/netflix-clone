'use client';

import Link from 'next/link';
import { useSesionCaducada } from '@/lib/sesion';

/**
 * Aviso de sesión caducada.
 *
 * Cuando el refresh token deja de valer, la sesión se limpia sola. Sin este
 * aviso, lo que ve el usuario es que la acción que estaba haciendo falla y que
 * la barra vuelve a decir "Entrar", sin ninguna explicación; con suerte lo
 * interpreta como un error de la aplicación.
 *
 * Se muestra como franja fija y no como diálogo: no interrumpe lo que se esté
 * haciendo, y navegar por el catálogo sigue funcionando sin sesión.
 */
export function AvisoSesion() {
  const { caducada, descartar } = useSesionCaducada();
  if (!caducada) return null;

  return (
    <div className="aviso-sesion" role="status" aria-live="polite">
      <span>Tu sesión ha caducado. Vuelve a entrar para seguir donde lo dejaste.</span>
      <span className="aviso-sesion-acciones">
        <Link href="/entrar" className="btn btn-play" onClick={descartar}>
          Entrar
        </Link>
        <button
          type="button"
          className="aviso-sesion-cerrar"
          onClick={descartar}
          aria-label="Descartar el aviso"
        >
          ✕
        </button>
      </span>
    </div>
  );
}
