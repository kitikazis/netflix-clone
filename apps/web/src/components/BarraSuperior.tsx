'use client';

import { Suspense, useState } from 'react';
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
      <Suspense fallback={<div className="buscador-marco" />}>
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
              <CaraPerfil
                url={sesion.perfilActivo.avatarUrl}
                nombre={sesion.perfilActivo.nombre}
              />
              <span className="barra-perfil-nombre">{sesion.perfilActivo.nombre}</span>
            </Link>
            {/* Con un perfil por cuenta no hay a qué cambiar: el botón solo
                aparece si de verdad hay entre qué elegir. */}
            {sesion.perfiles.length > 1 && (
              <button type="button" className="barra-btn" onClick={cambiarPerfil}>
                Cambiar
              </button>
            )}
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

/** Cara del perfil en la barra: la foto si la hay, y si no el disco de siempre. */
function CaraPerfil({ url, nombre }: { url: string | null; nombre: string }) {
  const [roto, setRoto] = useState(false);
  if (!url || roto) return <span aria-hidden>◉</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="barra-cara"
      src={url}
      // Vacío a propósito: el nombre va al lado, en texto. Repetirlo aquí haría
      // que un lector de pantalla lo dijera dos veces seguidas.
      alt=""
      title={nombre}
      width={24}
      height={24}
      referrerPolicy="no-referrer"
      onError={() => setRoto(true)}
    />
  );
}
