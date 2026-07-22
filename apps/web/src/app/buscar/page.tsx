import Link from 'next/link';
import type { Metadata } from 'next';
import { getCatalogo, getGeneros } from '@/lib/api';
import type { Contenido, Genero, Paginacion } from '@/lib/tipos';
import { PortadaVHS } from '@/components/PortadaVHS';
import { ApiDespertando } from '@/components/ApiDespertando';

export const dynamic = 'force-dynamic';

const LIMITE = 24;

type Params = {
  q?: string;
  tipo?: string;
  genero?: string;
  orden?: string;
  pagina?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const titulo = q ? `“${q}” — Búsqueda` : 'Buscar en el catálogo';
  return {
    title: `${titulo} · Videoclub`,
    description: q
      ? `Resultados para “${q}” en el catálogo del videoclub.`
      : 'Busca películas y series por título, tipo y género.',
  };
}

/** Reconstruye la URL cambiando solo una clave (y volviendo a la página 1). */
function conParam(actuales: Params, clave: keyof Params, valor?: string): string {
  const qs = new URLSearchParams();
  const siguiente: Params = { ...actuales, [clave]: valor, pagina: undefined };
  for (const [k, v] of Object.entries(siguiente)) {
    if (v) qs.set(k, v);
  }
  const cola = qs.toString();
  return cola ? `/buscar?${cola}` : '/buscar';
}

function conPagina(actuales: Params, pagina: number): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...actuales, pagina: String(pagina) })) {
    if (v) qs.set(k, v);
  }
  return `/buscar?${qs.toString()}`;
}

function Filtro({
  activo,
  href,
  children,
}: {
  activo: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`filtro ${activo ? 'activo' : ''}`}>
      {children}
    </Link>
  );
}

async function buscar(params: Params): Promise<{
  items: Contenido[];
  paginacion: Paginacion | null;
  error: boolean;
}> {
  const tipo = params.tipo === 'PELICULA' || params.tipo === 'SERIE' ? params.tipo : undefined;
  const orden =
    params.orden === 'TITULO' || params.orden === 'ANIO' ? params.orden : 'RECIENTE';
  const pagina = Math.max(1, Number(params.pagina) || 1);

  try {
    const res = await getCatalogo({
      q: params.q,
      tipo,
      generoSlug: params.genero,
      orden,
      pagina,
      limite: LIMITE,
    });
    return { items: res.datos, paginacion: res.paginacion, error: false };
  } catch {
    return { items: [], paginacion: null, error: true };
  }
}

export default async function Buscar({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const [{ items, paginacion, error }, generos] = await Promise.all([
    buscar(params),
    getGeneros(),
  ]);

  const orden = params.orden ?? 'RECIENTE';
  const pagina = paginacion?.pagina ?? 1;
  const totalPaginas = paginacion?.totalPaginas ?? 1;

  return (
    <div className="catalogo">
      <section className="fila">
        <div className="fila-cab">
          <span>⌕ BÚSQUEDA</span>
          {paginacion && (
            <span className="fila-perfil">
              {paginacion.total} RESULTADO{paginacion.total === 1 ? '' : 'S'}
            </span>
          )}
        </div>

        {params.q && (
          <p className="busqueda-consulta">
            Resultados para <b>“{params.q}”</b>
          </p>
        )}

        <div className="filtros">
          <div className="filtros-grupo">
            <span className="filtros-eti">TIPO</span>
            <Filtro activo={!params.tipo} href={conParam(params, 'tipo', undefined)}>
              TODO
            </Filtro>
            <Filtro
              activo={params.tipo === 'PELICULA'}
              href={conParam(params, 'tipo', 'PELICULA')}
            >
              PELÍCULAS
            </Filtro>
            <Filtro
              activo={params.tipo === 'SERIE'}
              href={conParam(params, 'tipo', 'SERIE')}
            >
              SERIES
            </Filtro>
          </div>

          <div className="filtros-grupo">
            <span className="filtros-eti">ORDEN</span>
            <Filtro activo={orden === 'RECIENTE'} href={conParam(params, 'orden', undefined)}>
              RECIENTE
            </Filtro>
            <Filtro activo={orden === 'TITULO'} href={conParam(params, 'orden', 'TITULO')}>
              A–Z
            </Filtro>
            <Filtro activo={orden === 'ANIO'} href={conParam(params, 'orden', 'ANIO')}>
              AÑO
            </Filtro>
          </div>

          {generos.length > 0 && (
            <div className="filtros-grupo">
              <span className="filtros-eti">GÉNERO</span>
              <Filtro activo={!params.genero} href={conParam(params, 'genero', undefined)}>
                TODOS
              </Filtro>
              {generos.map((g: Genero) => (
                <Filtro
                  key={g.id}
                  activo={params.genero === g.slug}
                  href={conParam(params, 'genero', g.slug)}
                >
                  {g.nombre.toUpperCase()}
                </Filtro>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <ApiDespertando que="los resultados" />
        ) : items.length === 0 ? (
          <div className="vacio">
            {params.q
              ? `Ninguna cinta coincide con “${params.q}”.`
              : 'Escribe algo en el buscador o ajusta los filtros.'}
          </div>
        ) : (
          <>
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

            {totalPaginas > 1 && (
              <nav className="paginacion" aria-label="Paginación">
                {pagina > 1 ? (
                  <Link href={conPagina(params, pagina - 1)} className="btn btn-fantasma">
                    ◀◀ ANTERIOR
                  </Link>
                ) : (
                  <span className="btn btn-off">◀◀ ANTERIOR</span>
                )}
                <span className="paginacion-pos">
                  {pagina} / {totalPaginas}
                </span>
                {pagina < totalPaginas ? (
                  <Link href={conPagina(params, pagina + 1)} className="btn btn-fantasma">
                    SIGUIENTE ▶▶
                  </Link>
                ) : (
                  <span className="btn btn-off">SIGUIENTE ▶▶</span>
                )}
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
