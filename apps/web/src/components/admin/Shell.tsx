'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEsAdmin, useSesion } from '@/lib/sesion';
import { BotonTema, useTema } from './Tema';

/**
 * Armazón del panel de administración.
 *
 * Deliberadamente no se parece al catálogo: fondo oscuro, tipografía de sistema
 * y densidad alta. El catálogo es un escaparate y se lee de lejos; esto es una
 * herramienta de trabajo donde lo que importa es ver muchas filas a la vez y
 * saber siempre en qué sección se está. Que se distingan también evita el
 * despiste de creer que se está mirando la web pública.
 */

const SECCIONES: Array<{ href: string; etiqueta: string; icono: string }> = [
  { href: '/admin', etiqueta: 'Resumen', icono: '◫' },
  { href: '/admin/catalogo', etiqueta: 'Catálogo', icono: '▤' },
  { href: '/admin/episodios', etiqueta: 'Episodios', icono: '⋮⋮' },
  { href: '/admin/subidas', etiqueta: 'Subidas', icono: '↑' },
  { href: '/admin/generos', etiqueta: 'Géneros', icono: '◇' },
  { href: '/admin/cuentas', etiqueta: 'Cuentas', icono: '○' },
  { href: '/admin/perfiles', etiqueta: 'Perfiles', icono: '◔' },
  { href: '/admin/progreso', etiqueta: 'Progreso', icono: '▶' },
];

interface Props {
  titulo: string;
  descripcion?: string;
  /** Controles propios de la sección: buscador, filtros, botón de alta. */
  acciones?: React.ReactNode;
  children: React.ReactNode;
}

export function Shell({ titulo, descripcion, acciones, children }: Props) {
  const sesion = useSesion();
  const esAdmin = useEsAdmin();
  const ruta = usePathname();
  const [tema, alternarTema] = useTema();

  if (!sesion) return <Aviso titulo="Administración" texto="Necesitas iniciar sesión." accion={{ href: '/entrar', etiqueta: 'Entrar' }} />;
  if (!esAdmin) {
    return (
      <Aviso
        titulo="Sin permiso"
        texto="Esta sección es solo para cuentas con rol de administrador."
        accion={{ href: '/', etiqueta: 'Volver al catálogo' }}
      />
    );
  }

  return (
    <div className="pa">
      <aside className="pa-lateral">
        <Link href="/" className="pa-marca">
          <span className="pa-marca-punto" aria-hidden />
          Kitiflix
        </Link>

        <nav className="pa-nav" aria-label="Secciones del panel">
          {SECCIONES.map((s) => {
            // `/admin` casa con todo si se compara por prefijo: es exacta.
            const activa = s.href === '/admin' ? ruta === s.href : ruta.startsWith(s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`pa-nav-item ${activa ? 'activa' : ''}`}
                aria-current={activa ? 'page' : undefined}
              >
                <span className="pa-nav-icono" aria-hidden>
                  {s.icono}
                </span>
                {s.etiqueta}
              </Link>
            );
          })}
        </nav>

        <div className="pa-pie">
          <BotonTema tema={tema} alAlternar={alternarTema} />
          <span className="pa-correo" title={sesion.correo}>
            {sesion.correo}
          </span>
          <Link href="/" className="pa-salir">
            Ir al catálogo
          </Link>
        </div>
      </aside>

      <div className="pa-cuerpo">
        <header className="pa-cabecera">
          <div>
            <h1 className="pa-titulo">{titulo}</h1>
            {descripcion && <p className="pa-descripcion">{descripcion}</p>}
          </div>
          {acciones && <div className="pa-acciones">{acciones}</div>}
        </header>
        <div className="pa-contenido">{children}</div>
      </div>
    </div>
  );
}

function Aviso({
  titulo,
  texto,
  accion,
}: {
  titulo: string;
  texto: string;
  accion: { href: string; etiqueta: string };
}) {
  return (
    <div className="entrar">
      <div className="panel">
        <div className="panel-cab">{titulo}</div>
        <p className="panel-txt">{texto}</p>
        <Link href={accion.href} className="btn btn-play">
          {accion.etiqueta}
        </Link>
      </div>
    </div>
  );
}
