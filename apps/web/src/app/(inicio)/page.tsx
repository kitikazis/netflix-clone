import Link from 'next/link';
import type { Metadata } from 'next';
import { getCatalogo, getCatalogoOpcional, getGeneros } from '@/lib/api';
import { fondoConDegradado } from '@/lib/css';
import type { Contenido, Genero } from '@/lib/tipos';
import { PortadaVHS } from '@/components/PortadaVHS';
import { FilaContinuar } from '@/components/FilaContinuar';
import { ApiDespertando } from '@/components/ApiDespertando';

// El catálogo se pide en cada request (contenido que cambia, no en build).
export const dynamic = 'force-dynamic';

/** Cuántas filas por género se pintan bajo el catálogo. */
const MAX_FILAS_GENERO = 4;
const POR_FILA = 12;

export const metadata: Metadata = {
  title: 'Videoclub — Catálogo',
  description:
    'Catálogo de películas y series del videoclub: portadas VHS, ficha y reproductor HLS.',
};

async function cargarCatalogo(): Promise<{ items: Contenido[]; error: boolean }> {
  try {
    const pagina = await getCatalogo({ limite: 24, orden: 'RECIENTE' });
    return { items: pagina.datos, error: false };
  } catch {
    return { items: [], error: true };
  }
}

interface FilaGenero {
  genero: Genero;
  items: Contenido[];
}

/** Filas por género, ya filtradas de las que no tienen nada publicado. */
async function cargarFilasGenero(): Promise<FilaGenero[]> {
  const generos = (await getGeneros()).slice(0, MAX_FILAS_GENERO);
  if (generos.length === 0) return [];

  const filas = await Promise.all(
    generos.map(async (genero) => ({
      genero,
      items: await getCatalogoOpcional({ generoSlug: genero.slug, limite: POR_FILA }),
    })),
  );
  return filas.filter((fila) => fila.items.length > 0);
}

export default async function Home() {
  const [{ items, error }, filasGenero] = await Promise.all([
    cargarCatalogo(),
    cargarFilasGenero(),
  ]);
  const destacado = items.find((c) => c.destacado) ?? items[0];

  return (
    <div className="catalogo">
      {/* Héroe: título destacado o cabecera del videoclub */}
      <section
        className="hero"
        style={fondoConDegradado(
          destacado?.backdropUrl,
          'linear-gradient(180deg, rgba(10,5,16,.35), rgba(10,5,16,.92))',
        )}
      >
        <div className="hero-cuerpo">
          <div className="canal">VIDEOCLUB · DIGITAL</div>
          {destacado ? (
            <>
              <h1 className="hero-titulo">{destacado.titulo}</h1>
              <p className="hero-sinopsis">{destacado.sinopsis ?? 'Sin sinopsis.'}</p>
              <div className="hero-acciones">
                <Link href={`/ver/${destacado.slug}`} className="btn btn-play">
                  ▶ REPRODUCIR
                </Link>
                <Link href={`/titulo/${destacado.slug}`} className="btn btn-fantasma">
                  + FICHA
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="wordmark">Netflix</h1>
              <p className="subtitulo">
                un <b>clon</b> de práctica
              </p>
            </>
          )}
        </div>
      </section>

      <FilaContinuar />

      <section className="fila">
        <div className="fila-cab">
          <span>▦ CATÁLOGO</span>
          <span className="fila-perfil">{items.length} TÍTULOS</span>
        </div>

        {error ? (
          // No se distingue aquí entre "dormida" y "caída": lo decide el
          // componente sondeando, y así el caso normal (arranque en frío del
          // hosting gratuito) no se presenta como un error.
          <ApiDespertando />
        ) : items.length === 0 ? (
          <div className="vacio">
            No hay títulos publicados todavía.
            <br />
            Crea contenido como admin en <code>POST /admin/catalogo/contenido</code>.
          </div>
        ) : (
          <div className="rejilla">
            {items.map((c, i) => (
              <PortadaVHS
                key={c.id}
                slug={c.slug}
                titulo={c.titulo}
                tipo={c.tipo}
                posterUrl={c.posterUrl}
                anio={c.anioLanzamiento}
                estado={c.estadoProcesamiento}
                prioridad={i < 6}
              />
            ))}
          </div>
        )}
      </section>

      {filasGenero.map(({ genero, items: deGenero }) => (
        <section className="fila" key={genero.id}>
          <div className="fila-cab">
            <span>▤ {genero.nombre.toUpperCase()}</span>
            <Link href={`/buscar?genero=${genero.slug}`} className="fila-vertodo">
              VER TODO ▶▶
            </Link>
          </div>
          <div className="carrusel">
            {deGenero.map((c) => (
              <PortadaVHS
                key={c.id}
                slug={c.slug}
                titulo={c.titulo}
                tipo={c.tipo}
                posterUrl={c.posterUrl}
                anio={c.anioLanzamiento}
                estado={c.estadoProcesamiento}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
