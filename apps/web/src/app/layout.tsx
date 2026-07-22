import type { Metadata } from 'next';
import { BarraSuperior } from '@/components/BarraSuperior';
import './globals.css';

export const metadata: Metadata = {
  title: 'Netflix Clone — Videoclub',
  description: 'Proyecto de práctica — catálogo con SSR y reproductor HLS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {/* Capas de pantalla CRT (compartidas por todas las páginas) */}
        <div className="overlay grain" aria-hidden />
        <div className="overlay scanlines" aria-hidden />
        <div className="overlay vignette" aria-hidden />
        <div className="overlay flicker" aria-hidden />
        <div className="tracking" aria-hidden />

        <BarraSuperior />
        <main className="contenido">{children}</main>
      </body>
    </html>
  );
}
