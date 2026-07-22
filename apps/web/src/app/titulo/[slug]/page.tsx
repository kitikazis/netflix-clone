import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTitulo } from '@/lib/api';
import { fondoImagen } from '@/lib/css';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

function duracion(min: number | null): string | null {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const titulo = await getTitulo(slug);
  if (!titulo) return { title: 'Título no encontrado — Kitiflix' };

  const descripcion =
    titulo.sinopsis ??
    `${titulo.tipo === 'SERIE' ? 'Serie' : 'Película'} disponible en Kitiflix.`;
  const imagen = titulo.backdropUrl ?? titulo.posterUrl;

  return {
    title: `${titulo.titulo} — Kitiflix`,
    description: descripcion,
    openGraph: {
      title: titulo.titulo,
      description: descripcion,
      type: titulo.tipo === 'SERIE' ? 'video.tv_show' : 'video.movie',
      ...(imagen ? { images: [{ url: imagen }] } : {}),
    },
  };
}

export default async function FichaTitulo({ params }: Props) {
  const { slug } = await params;
  const titulo = await getTitulo(slug);
  if (!titulo) notFound();

  const listo = titulo.estadoProcesamiento === 'LISTO' && !!titulo.hlsPlaylistUrl;
  const episodios = titulo.episodios ?? [];
  const primerEpisodio = episodios[0];

  const meta = [
    titulo.anioLanzamiento ? String(titulo.anioLanzamiento) : null,
    titulo.clasificacionEdad,
    titulo.tipo === 'PELICULA' ? duracion(titulo.duracionMinutos) : `${episodios.length} episodios`,
  ].filter(Boolean);

  return (
    <article className="ficha">
      <div
        className="ficha-hero"
        style={fondoImagen(titulo.backdropUrl)}
      >
        <div className="ficha-cuerpo">
          <span className={`vhs-tipo ${titulo.tipo === 'SERIE' ? 'serie' : 'peli'}`}>
            {titulo.tipo === 'SERIE' ? 'Serie' : 'Película'}
          </span>
          <h1 className="ficha-titulo">{titulo.titulo}</h1>
          <div className="ficha-meta">{meta.join('  ·  ')}</div>

          {titulo.generos && titulo.generos.length > 0 && (
            <div className="ficha-generos">
              {titulo.generos.map((g) => (
                <span key={g.id} className="etiqueta">
                  {g.nombre}
                </span>
              ))}
            </div>
          )}

          <p className="ficha-sinopsis">{titulo.sinopsis ?? 'Sin sinopsis.'}</p>

          <div className="hero-acciones">
            {titulo.tipo === 'PELICULA' ? (
              listo ? (
                <Link href={`/ver/${titulo.slug}`} className="btn btn-play">
                  Reproducir
                </Link>
              ) : (
                <span className="btn btn-off">Aún no disponible</span>
              )
            ) : primerEpisodio ? (
              <Link href={`/ver/${titulo.slug}?episodio=${primerEpisodio.id}`} className="btn btn-play">
                Ver T{primerEpisodio.temporada} · E{primerEpisodio.numeroEpisodio}
              </Link>
            ) : (
              <span className="btn btn-off">Sin episodios</span>
            )}
          </div>
        </div>
      </div>

      {titulo.tipo === 'SERIE' && episodios.length > 0 && (
        <section className="episodios">
          <div className="fila-cab">
            <span>Episodios</span>
          </div>
          <ul className="lista-epis">
            {episodios.map((ep) => {
              const epListo = ep.estadoProcesamiento === 'LISTO' && !!ep.hlsPlaylistUrl;
              const contenido = (
                <>
                  <span className="epi-num">
                    T{ep.temporada} · E{ep.numeroEpisodio}
                  </span>
                  <span className="epi-info">
                    <span className="epi-titulo">{ep.titulo}</span>
                    {ep.sinopsis && <span className="epi-sinopsis">{ep.sinopsis}</span>}
                  </span>
                  <span className={`epi-estado ${epListo ? 'ok' : 'off'}`}>
                    {epListo ? '▶' : 'Próximamente'}
                  </span>
                </>
              );
              return (
                <li key={ep.id} className="epi">
                  {epListo ? (
                    <Link href={`/ver/${titulo.slug}?episodio=${ep.id}`} className="epi-link">
                      {contenido}
                    </Link>
                  ) : (
                    <div className="epi-link off">{contenido}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
