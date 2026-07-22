import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTitulo, urlMedia } from '@/lib/api';
import { ReproductorHls, type EnlaceSiguiente } from '@/components/ReproductorHls';
import type { Episodio } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ episodio?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [{ slug }, { episodio: episodioId }] = await Promise.all([params, searchParams]);
  const titulo = await getTitulo(slug);
  if (!titulo) return { title: 'Cinta no encontrada — Videoclub' };

  const ep = episodioId
    ? titulo.episodios?.find((e) => e.id === episodioId)
    : undefined;
  const nombre = ep
    ? `${titulo.titulo} · T${ep.temporada}E${ep.numeroEpisodio}`
    : titulo.titulo;

  return {
    title: `▶ ${nombre} — Videoclub`,
    description: (ep?.sinopsis ?? titulo.sinopsis) || `Reproduciendo ${titulo.titulo}.`,
    // Una página de reproducción no aporta nada a un buscador y expone la
    // estructura de la biblioteca: fuera del índice.
    robots: { index: false, follow: false },
  };
}

/** Siguiente episodio reproducible, para encadenar al terminar. */
function siguienteDe(
  episodios: Episodio[],
  actual: Episodio | undefined,
  slug: string,
): EnlaceSiguiente | null {
  if (!actual) return null;
  const i = episodios.findIndex((e) => e.id === actual.id);
  if (i < 0) return null;
  const siguiente = episodios
    .slice(i + 1)
    .find((e) => e.estadoProcesamiento === 'LISTO' && !!e.hlsPlaylistUrl);
  if (!siguiente) return null;
  return {
    href: `/ver/${slug}?episodio=${siguiente.id}`,
    etiqueta: `T${siguiente.temporada} · E${siguiente.numeroEpisodio} — ${siguiente.titulo}`,
  };
}

export default async function VerTitulo({ params, searchParams }: Props) {
  const { slug } = await params;
  const { episodio: episodioId } = await searchParams;
  const titulo = await getTitulo(slug);
  if (!titulo) notFound();

  const episodios = titulo.episodios ?? [];
  const episodio = episodioId ? episodios.find((e) => e.id === episodioId) : undefined;

  // Un id de episodio que no pertenece a este título es una URL rota, no un
  // título sin episodio: mejor 404 que reproducir otra cosa en silencio.
  if (episodioId && !episodio) notFound();

  const hls = episodio ? episodio.hlsPlaylistUrl : titulo.hlsPlaylistUrl;
  const duracionSegundos = episodio ? episodio.duracionSegundos : titulo.duracionSegundos;
  const etiqueta = episodio
    ? `T${episodio.temporada} · E${episodio.numeroEpisodio} — ${episodio.titulo}`
    : titulo.titulo;

  return (
    <div className="ver">
      <div className="ver-cab">
        <Link href={`/titulo/${titulo.slug}`} className="ver-volver">
          ◀◀ VOLVER A LA FICHA
        </Link>
        <span className="ver-titulo">{etiqueta}</span>
      </div>

      <ReproductorHls
        src={urlMedia(hls)}
        contenidoId={titulo.id}
        episodioId={episodio?.id}
        duracionSegundos={duracionSegundos}
        poster={titulo.backdropUrl}
        siguiente={siguienteDe(episodios, episodio, titulo.slug)}
      />
    </div>
  );
}
