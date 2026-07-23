import type { Metadata } from 'next';
import { CromoPublico, PiePublico } from '@/components/CromoPublico';
import { display, texto } from './fuentes';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kitiflix',
  description: 'Catálogo de cine con reproducción en streaming',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${texto.variable}`}>
      <body>
        <CromoPublico>{children}</CromoPublico>

        {/* Atribución a TMDB: su licencia de uso la exige para las carátulas y
            sinopsis del catálogo. La coletilla de "no avalado" también es suya. */}
        <PiePublico>
        <footer className="pie">
          <span>Proyecto de práctica · sin ánimo comercial</span>
          <span className="pie-tmdb">
            Carátulas y sinopsis de{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              TMDB
            </a>
            . Este producto usa la API de TMDB, pero no está avalado ni
            certificado por TMDB.
          </span>
        </footer>
        </PiePublico>
      </body>
    </html>
  );
}
