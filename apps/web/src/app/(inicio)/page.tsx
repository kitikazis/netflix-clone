import Link from 'next/link';
import type { Metadata } from 'next';
import { getCatalogo, getCatalogoOpcional, getGeneros } from '@/lib/api';
import { fondoImagen } from '@/lib/css';
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
  title: 'Kitiflix — Catálogo',
  description:
    'Catálogo de películas y series del videoclub: busca, descubre y reproduce.',
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

/**
 * Filas por género.
 *
 * Los géneros se eligen a partir de los títulos más recientes, no por orden
 * alfabético: así la portada enseña dónde hay novedades en vez de empezar
 * siempre por la primera letra del abecedario, que no le dice nada a nadie.
 *
 * Además no cuesta ninguna consulta extra — se reutiliza el listado que ya se
 * ha pedido para la rejilla principal.
 */
async function cargarFilasGenero(recientes: Contenido[]): Promise<FilaGenero[]> {
  const porNovedad: Genero[] = [];
  for (const item of recientes) {
    for (const g of item.generos ?? []) {
      if (!porNovedad.some((x) => x.id === g.id)) porNovedad.push(g);
    }
  }

  // Si los recientes no traen géneros (catálogo vacío), se cae al listado.
  const generos = (
    porNovedad.length > 0 ? porNovedad : await getGeneros()
  ).slice(0, MAX_FILAS_GENERO);
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
  const { items, error } = await cargarCatalogo();
  const filasGenero = await cargarFilasGenero(items);
  const destacado = items.find((c) => c.destacado) ?? items[0];

  return (
    <div className="catalogo">
      {/* Héroe: título destacado o cabecera del videoclub */}
      <section className="hero">
        <div className="hero-lamina" style={fondoImagen(destacado?.posterUrl)} aria-hidden />
        <div className="hero-cuerpo">
          <div className="canal">Destacado</div>
          {destacado ? (
            <>
              <h1 className="hero-titulo">{destacado.titulo}</h1>
              <p className="hero-sinopsis">{destacado.sinopsis ?? 'Sin sinopsis.'}</p>
              <div className="hero-acciones">
                <Link href={`/ver/${destacado.slug}`} className="btn btn-play">
                  Reproducir
                </Link>
                <Link href={`/titulo/${destacado.slug}`} className="btn btn-fantasma">
                  Más información
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="wordmark">Kitiflix</h1>
              <p className="subtitulo">
                Cine para ver cuando te apetezca
              </p>
            </>
          )}
        </div>
      </section>

      <FilaContinuar />

      <section className="fila">
        <div className="fila-cab">
          <span>Catálogo</span>
          <span className="fila-perfil">{items.length} títulos</span>
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
                indice={i + 1}
              />
            ))}
          </div>
        )}
      </section>

      {filasGenero.map(({ genero, items: deGenero }) => (
        <section className="fila" key={genero.id}>
          <div className="fila-cab">
            <span>{genero.nombre}</span>
            <Link href={`/buscar?genero=${genero.slug}`} className="fila-vertodo">
              Ver todo
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
