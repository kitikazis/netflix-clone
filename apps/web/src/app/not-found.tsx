import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cinta no encontrada — Videoclub',
};

/** 404 de la app: la lanza `notFound()` desde las fichas y el reproductor. */
export default function NoEncontrado() {
  return (
    <div className="estado-pagina">
      <div className="estado-panel">
        <div className="estado-glitch">░▒▓ CINTA NO ENCONTRADA ▓▒░</div>
        <p className="estado-txt">
          Este título no está en la estantería. Puede que lo hayan retirado o que
          la dirección esté mal escrita.
        </p>
        <div className="estado-acciones">
          <Link href="/" className="btn btn-play">
            ◀◀ VOLVER AL CATÁLOGO
          </Link>
          <Link href="/buscar" className="btn btn-fantasma">
            ⌕ BUSCAR
          </Link>
        </div>
      </div>
    </div>
  );
}
