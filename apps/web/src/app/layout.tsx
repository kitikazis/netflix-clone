import type { Metadata } from 'next';
import { CentinelaApp } from '@/components/CentinelaApp';
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
        <CentinelaApp />
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

        {/* Red de seguridad para la pantalla en blanco: si a los 10 s la app no
            ha dado señales de vida (navegador que no entiende el bundle, CSS
            que no cargó, hidratación que reventó), este aviso —con estilos en
            línea para no depender del CSS— aparece y ofrece el diagnóstico, en
            vez de dejar al usuario mirando el vacío. El centinela lo oculta si
            la app acaba montando. */}
        <div
          id="sin-app"
          hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
            background: '#f4efe6',
            color: '#1a1614',
            font: '16px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          }}
        >
          <strong style={{ fontSize: '20px' }}>No pudimos cargar Kitiflix</strong>
          <span style={{ maxWidth: '420px', color: '#5c534c' }}>
            Puede que tu navegador sea demasiado antiguo. Abre el diagnóstico y mándanos una captura
            para que podamos arreglarlo.
          </span>
          <a
            href="/diagnostico.html"
            style={{
              display: 'inline-block',
              padding: '12px 20px',
              borderRadius: '8px',
              background: '#a8342a',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Abrir diagnóstico
          </a>
        </div>

        {/* Vigía en ES5 puro: un inline script se interpreta aunque el bundle
            moderno de la app falle al parsear, así que este temporizador corre
            en el navegador problemático precisamente cuando más falta hace. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){window.setTimeout(function(){' +
              'if(window.__kitiflixOk){return;}' +
              "var el=document.getElementById('sin-app');" +
              'if(el){el.hidden=false;}' +
              '},10000);})();',
          }}
        />
      </body>
    </html>
  );
}
