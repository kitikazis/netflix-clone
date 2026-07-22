import Link from 'next/link';
import type { EstadoProcesamiento, TipoContenido } from '@/lib/tipos';
import { PosterImagen } from './PosterImagen';

interface Props {
  slug: string;
  titulo: string;
  tipo: TipoContenido;
  posterUrl?: string | null;
  anio?: number | null;
  estado?: EstadoProcesamiento;
  /** Progreso 0-100: dibuja la barra "continuar viendo" si se pasa. */
  porcentaje?: number;
  /** Destino; por defecto la ficha del título. */
  href?: string;
  /** Etiqueta bajo el título (p. ej. "T1 · E3"). */
  subtitulo?: string;
  /** Carga con prioridad (solo para las primeras portadas visibles). */
  prioridad?: boolean;
  /** Si se pasa, muestra el botón de quitar de "continuar viendo". */
  alQuitar?: () => void;
}

/** Carátula estilo carcasa VHS con etiqueta impresa. */
export function PortadaVHS({
  slug,
  titulo,
  tipo,
  posterUrl,
  anio,
  estado,
  porcentaje,
  href,
  subtitulo,
  prioridad,
  alQuitar,
}: Props) {
  const listo = !estado || estado === 'LISTO';

  return (
    // El botón de quitar va FUERA del <Link> (un botón dentro de un enlace es
    // HTML inválido), de ahí este contenedor.
    <div className="vhs-slot">
      <Link href={href ?? `/titulo/${slug}`} className="vhs" title={titulo}>
        <div className="vhs-carcasa">
          <div className="vhs-poster">
            <PosterImagen
              src={posterUrl}
              alt={`Carátula de ${titulo}`}
              respaldo={titulo}
              prioridad={prioridad}
            />
            <span className={`vhs-tipo ${tipo === 'SERIE' ? 'serie' : 'peli'}`}>
              {tipo === 'SERIE' ? 'SERIE' : 'PELÍCULA'}
            </span>
            {!listo && <span className="vhs-estado">Próximamente</span>}
          </div>
          <div className="vhs-etiqueta">
            <span className="vhs-titulo">{titulo}</span>
            <span className="vhs-meta">{subtitulo ?? (anio ? String(anio) : '——')}</span>
          </div>
          {porcentaje !== undefined && (
            <div className="vhs-progreso" aria-hidden>
              <span style={{ width: `${Math.min(100, Math.max(2, porcentaje))}%` }} />
            </div>
          )}
        </div>
      </Link>

      {alQuitar && (
        <button
          type="button"
          className="vhs-quitar"
          aria-label={`Quitar ${titulo} de continuar viendo`}
          title="Quitar de continuar viendo"
          onClick={alQuitar}
        >
          ✕
        </button>
      )}
    </div>
  );
}
