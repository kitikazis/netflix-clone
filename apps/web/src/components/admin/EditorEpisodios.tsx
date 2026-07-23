'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  type DatosEpisodio,
  actualizarEpisodio,
  crearEpisodio,
  eliminarEpisodio,
  listarEpisodios,
} from '@/lib/admin';
import type { Contenido, Episodio } from '@/lib/tipos';
import { SubirVideo } from './SubirVideo';

interface Props {
  serie: Contenido;
  alCerrar: () => void;
}

const VACIO: DatosEpisodio = {
  temporada: 1,
  numeroEpisodio: 1,
  titulo: '',
  sinopsis: '',
  duracionMinutos: null,
};

/**
 * Episodios de una serie: alta, edición, borrado y subida de vídeo.
 *
 * Se agrupan por temporada porque es como se piensan y como se numeran; una
 * lista plana de cuarenta episodios obliga a leer dos columnas de números para
 * saber dónde está uno.
 */
export function EditorEpisodios({ serie, alCerrar }: Props) {
  const [episodios, setEpisodios] = useState<Episodio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Episodio | null>(null);
  const [creando, setCreando] = useState(false);
  const [subiendo, setSubiendo] = useState<Episodio | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setEpisodios(await listarEpisodios(serie.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los episodios');
    } finally {
      setCargando(false);
    }
  }, [serie.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function borrar(ep: Episodio) {
    if (!confirm(`¿Eliminar T${ep.temporada}E${ep.numeroEpisodio} «${ep.titulo}»?`)) return;
    setBorrando(ep.id);
    try {
      await eliminarEpisodio(ep.id);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setBorrando(null);
    }
  }

  // Siguiente hueco: continuar la última temporada es lo que se hace casi siempre.
  const siguiente = (): DatosEpisodio => {
    if (episodios.length === 0) return VACIO;
    const temporada = Math.max(...episodios.map((e) => e.temporada));
    const dentro = episodios.filter((e) => e.temporada === temporada);
    return {
      ...VACIO,
      temporada,
      numeroEpisodio: Math.max(...dentro.map((e) => e.numeroEpisodio)) + 1,
    };
  };

  const temporadas = [...new Set(episodios.map((e) => e.temporada))].sort((a, b) => a - b);

  if (creando || editando) {
    return (
      <FormularioEpisodio
        serieId={serie.id}
        episodio={editando}
        inicial={editando ? null : siguiente()}
        alCancelar={() => {
          setCreando(false);
          setEditando(null);
        }}
        alGuardar={() => {
          setCreando(false);
          setEditando(null);
          void cargar();
        }}
      />
    );
  }

  return (
    <div className="admin-episodios">
      {/* El armazón del panel ya rotula la sección y la serie: aquí solo van
          las acciones. */}
      <div className="admin-barra">
        <button type="button" className="pa-btn" onClick={alCerrar}>
          ‹ Volver al catálogo
        </button>
        <button type="button" className="pa-btn primario" onClick={() => setCreando(true)}>
          + Nuevo episodio
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {subiendo && (
        <SubirVideo
          destino={{ tipo: 'episodio', id: subiendo.id }}
          nombre={`T${subiendo.temporada}E${subiendo.numeroEpisodio} · ${subiendo.titulo}`}
          estadoActual={subiendo.estadoProcesamiento}
          alTerminar={() => void cargar()}
          alCerrar={() => setSubiendo(null)}
        />
      )}

      {cargando ? (
        <div className="vacio">Cargando…</div>
      ) : episodios.length === 0 ? (
        <div className="vacio">Esta serie todavía no tiene episodios.</div>
      ) : (
        temporadas.map((t) => (
          <div key={t} className="admin-temporada">
            <h3 className="admin-temporada-cab">Temporada {t}</h3>
            <div className="admin-tabla-marco">
              <table className="admin-tabla">
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Título</th>
                    <th>Duración</th>
                    <th>Vídeo</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {episodios
                    .filter((e) => e.temporada === t)
                    .map((ep) => (
                      <tr key={ep.id}>
                        <td>{ep.numeroEpisodio}</td>
                        <td>{ep.titulo}</td>
                        <td>{ep.duracionMinutos ? `${ep.duracionMinutos} min` : '—'}</td>
                        <td>
                          <span className={`pa-estado ${ep.estadoProcesamiento.toLowerCase()}`}>
                            {ep.estadoProcesamiento}
                          </span>
                        </td>
                        <td className="admin-acciones">
                          <button
                            type="button"
                            className="pa-btn"
                            onClick={() => setSubiendo(ep)}
                          >
                            {ep.hlsPlaylistUrl ? 'Reemplazar vídeo' : 'Subir vídeo'}
                          </button>
                          <button
                            type="button"
                            className="pa-btn"
                            onClick={() => setEditando(ep)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="pa-btn peligro"
                            disabled={borrando === ep.id}
                            onClick={() => void borrar(ep)}
                          >
                            {borrando === ep.id ? '…' : 'Borrar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function FormularioEpisodio({
  serieId,
  episodio,
  inicial,
  alCancelar,
  alGuardar,
}: {
  serieId: string;
  episodio: Episodio | null;
  inicial: DatosEpisodio | null;
  alCancelar: () => void;
  alGuardar: () => void;
}) {
  const [datos, setDatos] = useState<DatosEpisodio>(
    episodio
      ? {
          temporada: episodio.temporada,
          numeroEpisodio: episodio.numeroEpisodio,
          titulo: episodio.titulo,
          sinopsis: episodio.sinopsis ?? '',
          duracionMinutos: episodio.duracionMinutos,
        }
      : (inicial ?? VACIO),
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      if (episodio) await actualizarEpisodio(episodio.id, datos);
      else await crearEpisodio(serieId, datos);
      alGuardar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(e) => void enviar(e)}>
      {/* Aquí sí hace falta: el armazón rotula la serie, no si se está dando
          de alta un episodio o editando uno que ya existe. */}
      <h2 className="admin-temporada-cab">
        {episodio ? `Editar T${episodio.temporada}E${episodio.numeroEpisodio}` : 'Nuevo episodio'}
      </h2>
      <div className="admin-campos">
        <label className="campo">
          <span>Temporada</span>
          <input
            type="number"
            min={1}
            max={100}
            required
            value={datos.temporada}
            onChange={(e) => setDatos({ ...datos, temporada: Number(e.target.value) })}
          />
        </label>
        <label className="campo">
          <span>Episodio</span>
          <input
            type="number"
            min={1}
            max={1000}
            required
            value={datos.numeroEpisodio}
            onChange={(e) => setDatos({ ...datos, numeroEpisodio: Number(e.target.value) })}
          />
        </label>
        <label className="campo">
          <span>Duración (min)</span>
          <input
            type="number"
            min={1}
            value={datos.duracionMinutos ?? ''}
            onChange={(e) =>
              setDatos({
                ...datos,
                duracionMinutos: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </label>

        <label className="campo admin-ancho">
          <span>Título</span>
          <input
            required
            maxLength={255}
            value={datos.titulo}
            onChange={(e) => setDatos({ ...datos, titulo: e.target.value })}
          />
        </label>

        <label className="campo admin-ancho">
          <span>Sinopsis</span>
          <textarea
            rows={4}
            value={datos.sinopsis ?? ''}
            onChange={(e) => setDatos({ ...datos, sinopsis: e.target.value })}
          />
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="admin-form-acciones">
        <button type="submit" className="btn btn-play" disabled={guardando || !datos.titulo.trim()}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="btn btn-fantasma" onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
