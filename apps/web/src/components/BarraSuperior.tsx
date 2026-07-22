'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cerrarSesion, salirDelPerfil, useSesion } from '@/lib/sesion';
import { Buscador } from './Buscador';

/** Barra superior estilo OSD de videograbadora: marca, buscador y sesión. */
export function BarraSuperior() {
  const sesion = useSesion();
  const router = useRouter();

  async function salir() {
    await cerrarSesion();
    router.push('/');
    router.refresh();
  }

  function cambiarPerfil() {
    salirDelPerfil();
    router.push('/entrar');
  }

  return (
    <header className="barra">
      <Link href="/" className="marca" aria-label="Inicio">
        <span className="marca-play">▶</span>
        <span className="marca-txt">NETFLIX</span>
        <span className="marca-cinta">VIDEOCLUB · CH 03</span>
      </Link>

      {/* Suspense: el buscador lee los search params, que obligan a diferir el
          prerenderizado de lo que hay dentro. */}
      <Suspense fallback={<div className="buscador" />}>
        <Buscador />
      </Suspense>

      <nav className="barra-nav">
        <Link href="/" className="barra-link">
          CATÁLOGO
        </Link>
        {sesion?.perfilActivo ? (
          <span className="barra-sesion">
            <Link href="/perfiles" className="barra-perfil" title="Gestionar perfiles">
              ◉ {sesion.perfilActivo.nombre}
            </Link>
            <button type="button" className="barra-btn" onClick={cambiarPerfil}>
              CAMBIAR
            </button>
            <button type="button" className="barra-btn" onClick={salir}>
              SALIR
            </button>
          </span>
        ) : (
          <Link href="/entrar" className="barra-btn">
            ENTRAR
          </Link>
        )}
      </nav>
    </header>
  );
}
