'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cerrarSesion, salirDelPerfil, useEsAdmin, useSesion } from '@/lib/sesion';
import { Buscador } from './Buscador';

/** Barra superior estilo OSD de videograbadora: marca, buscador y sesión. */
export function BarraSuperior() {
  const sesion = useSesion();
  const esAdmin = useEsAdmin();
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
        <span className="marca-txt">Kitiflix</span>
        
      </Link>

      {/* Suspense: el buscador lee los search params, que obligan a diferir el
          prerenderizado de lo que hay dentro. */}
      <Suspense fallback={<div className="buscador" />}>
        <Buscador />
      </Suspense>

      <nav className="barra-nav">
        {/* Se muestra según el rol del token, pero quien autoriza de verdad es
            la API: forzar esto en el navegador solo enseña un enlace. */}
        {esAdmin && (
          <Link href="/admin" className="barra-link">
            Administrar
          </Link>
        )}
        <Link href="/" className="barra-link">
          Catálogo
        </Link>
        {sesion?.perfilActivo ? (
          <span className="barra-sesion">
            <Link href="/perfiles" className="barra-perfil" title="Gestionar perfiles">
              ◉ {sesion.perfilActivo.nombre}
            </Link>
            <button type="button" className="barra-btn" onClick={cambiarPerfil}>
              Cambiar
            </button>
            <button type="button" className="barra-btn" onClick={salir}>
              Salir
            </button>
          </span>
        ) : (
          <Link href="/entrar" className="barra-btn">
            Entrar
          </Link>
        )}
      </nav>
    </header>
  );
}
