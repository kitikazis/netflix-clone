'use client';

import { usePathname } from 'next/navigation';
import { BarraSuperior } from './BarraSuperior';
import { AvisoSesion } from './AvisoSesion';

/**
 * Cabecera y aviso de sesión de la web pública.
 *
 * El panel de administración trae su propio armazón —barra lateral y cabecera
 * propias— y ocupa la pantalla entera, así que la barra del catálogo sobra ahí:
 * duplicaría la navegación y robaría alto útil a las tablas.
 */
export function CromoPublico({ children }: { children: React.ReactNode }) {
  const esPanel = usePathname().startsWith('/admin');
  if (esPanel) return <>{children}</>;

  return (
    <>
      <BarraSuperior />
      <AvisoSesion />
      <main className="contenido">{children}</main>
    </>
  );
}

/** El pie solo tiene sentido en la parte pública (atribución a TMDB). */
export function PiePublico({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith('/admin') ? null : <>{children}</>;
}
