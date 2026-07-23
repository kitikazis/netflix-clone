'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  eliminarContenido,
  listarContenido,
  listarGeneros,
  type FiltrosAdmin,
} from '@/lib/admin';
import type { Contenido, Genero, Paginacion } from '@/lib/tipos';
import { Shell } from '@/components/admin/Shell';
import { FormularioContenido } from '@/components/admin/FormularioContenido';
import { EditorEpisodios } from '@/components/admin/EditorEpisodios';
import { SubirVideo } from '@/components/admin/SubirVideo';
import { EstadoVideo } from '@/components/admin/EstadoVideo';
import { obtenerProgresos } from '@/lib/subidas';

const LIMITE = 20;

export default function CatalogoAdmin() {
  const [items, setItems] = useState<Contenido[]>([]);
  const [paginacion, setPaginacion] = useState<Paginacion | null>(null);
  const [generos, setGeneros] = useState<Genero[]>([]);
  const [pagina, setPagina] = useState(1);
  const [consulta, setConsulta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [soloBorradores, setSoloBorradores] = useState(false);

  const [editando, setEditando] = useState<Contenido | null>(null);
  const [creando, setCreando] = useState(false);
  const [episodiosDe, setEpisodiosDe] = useState<Contenido | null>(null);
  const [subiendo, setSubiendo] = useState<Contenido | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  const [progresos, setProgresos] = useState<Record<string, number>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const filtros: FiltrosAdmin = { pagina, limite: LIMITE };
      if (busqueda) filtros.q = busqueda;
      // El listado de administración devuelve todo; para ver solo los
      // borradores hay que pedir explícitamente publicado=false.
      if (soloBorradores) filtros.publicado = false;
      // El progreso vive en la cola, no en la fila: va en su propia consulta.
      // Si falla, se pierde el porcentaje pero la tabla se sigue viendo.
      const [res, avance] = await Promise.all([
        listarContenido(filtros),
        obtenerProgresos().catch(() => ({})),
      ]);
      setItems(res.datos);
      setPaginacion(res.paginacion);
      setProgresos(avance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo');
    } finally {
      setCargando(false);
    }
  }, [pagina, busqueda, soloBorradores]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Mientras haya algo transcodificando, refrescar solo.
   *
   * La transcodificación corre en un worker aparte y la tabla no se enteraba de
   * que había terminado: se quedaba igual hasta que alguien recargaba la página.
   * Eso hacía parecer lentísimo un proceso que suele tardar menos de un minuto,
   * porque acababa y nadie lo decía.
   *
   * No vale con mirar los PENDIENTE: ese es también el estado de los mil títulos
   * que nunca han tenido vídeo, y consultaríamos para siempre. Se mira lo que el
   * worker ya cogió (PROCESANDO) más lo que se acaba de encolar desde aquí,
   * hasta que ese termine de una forma u otra.
   */
  const [recienEncolados, setRecienEncolados] = useState<string[]>([]);
  const esperando = recienEncolados.filter((id) => {
    const item = items.find((c) => c.id === id);
    return !item || (item.estadoProcesamiento !== 'LISTO' && item.estadoProcesamiento !== 'ERROR');
  });
  const enMarcha =
    esperando.length > 0 ||
    Object.keys(progresos).length > 0 ||
    items.some((c) => c.estadoProcesamiento === 'PROCESANDO');

  useEffect(() => {
    if (!enMarcha) return;
    // Tres segundos: con cinco, la barra de progreso daba saltos demasiado
    // grandes para leerse como algo que avanza.
    const t = window.setInterval(() => void cargar(), 3000);
    return () => window.clearInterval(t);
  }, [enMarcha, cargar]);

  useEffect(() => {
    listarGeneros()
      .then(setGeneros)
      .catch(() => setGeneros([]));
  }, []);

  function buscar(e: FormEvent) {
    e.preventDefault();
    setPagina(1);
    setBusqueda(consulta.trim());
  }

  async function borrar(c: Contenido) {
    if (!confirm(`¿Eliminar «${c.titulo}»? No se puede deshacer.`)) return;
    setBorrando(c.id);
    try {
      await eliminarContenido(c.id);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setBorrando(null);
    }
  }

  if (episodiosDe) {
    return (
      <Shell titulo="Episodios" descripcion={episodiosDe.titulo}>
        <EditorEpisodios
          serie={episodiosDe}
          alCerrar={() => {
            setEpisodiosDe(null);
            void cargar();
          }}
        />
      </Shell>
    );
  }

  if (creando || editando) {
    return (
      <Shell titulo={creando ? 'Nuevo título' : 'Editar título'}>
        <FormularioContenido
          contenido={editando}
          generos={generos}
          alCancelar={() => {
            setCreando(false);
            setEditando(null);
          }}
          alGuardar={(guardado) => {
            setCreando(false);
            setEditando(null);
            void cargar();
            // Recién creada una película, lo siguiente es siempre darle vídeo:
            // se abre la subida en lugar de dejar la ficha vacía en la tabla.
            if (guardado && guardado.tipo === 'PELICULA' && !guardado.hlsPlaylistUrl) {
              setSubiendo(guardado);
            }
          }}
        />
      </Shell>
    );
  }

  const totalPaginas = paginacion?.totalPaginas ?? 1;

  return (
    <Shell
      titulo="Catálogo"
      descripcion={
        paginacion
          ? `${paginacion.total.toLocaleString('es')} títulos`
          : 'Títulos, vídeos y episodios'
      }
      acciones={
        <>
          <form className="pa-buscador" onSubmit={buscar} role="search">
            <span aria-hidden>⌕</span>
            <input
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Buscar por título…"
              aria-label="Filtrar títulos del panel"
            />
          </form>
          <label className="pa-check">
            <input
              type="checkbox"
              checked={soloBorradores}
              onChange={(e) => {
                setPagina(1);
                setSoloBorradores(e.target.checked);
              }}
            />
            <span>Solo borradores</span>
          </label>
          <button type="button" className="pa-btn primario" onClick={() => setCreando(true)}>
            + Nuevo título
          </button>
        </>
      }
    >
      {error && <div className="form-error">{error}</div>}

      {subiendo && (
        <SubirVideo
          destino={{ tipo: 'contenido', id: subiendo.id }}
          nombre={subiendo.titulo}
          // Del listado recién cargado, no del objeto con el que se abrió: así
          // el estado de la cabecera avanza con los refrescos automáticos.
          estadoActual={
            items.find((c) => c.id === subiendo.id)?.estadoProcesamiento ??
            subiendo.estadoProcesamiento
          }
          alTerminar={() => {
            setRecienEncolados((ids) => [...new Set([...ids, subiendo.id])]);
            void cargar();
          }}
          alCerrar={() => setSubiendo(null)}
        />
      )}

      {cargando && items.length === 0 ? (
        <div className="vacio">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="vacio">No hay títulos que coincidan.</div>
      ) : (
        <div className="admin-tabla-marco">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Año</th>
                <th>Estado</th>
                <th>Vídeo</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/titulo/${c.slug}`} className="admin-titulo">
                      {c.titulo}
                    </Link>
                    {c.destacado && <span className="admin-marca">Destacado</span>}
                  </td>
                  <td>{c.tipo === 'SERIE' ? 'Serie' : 'Película'}</td>
                  <td>{c.anioLanzamiento ?? '—'}</td>
                  <td>
                    <span className={`pa-pastilla ${c.publicado ? 'si' : 'no'}`}>
                      {c.publicado ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td>
                    <EstadoVideo
                      estado={c.estadoProcesamiento}
                      progreso={progresos[c.id]}
                      tieneVideo={!!c.hlsPlaylistUrl}
                    />
                  </td>
                  <td className="admin-acciones">
                    {/* En una serie el vídeo cuelga de cada episodio, no del
                        título: subirlo aquí no tendría dónde reproducirse. */}
                    {c.tipo === 'SERIE' ? (
                      <button
                        type="button"
                        className="pa-btn"
                        onClick={() => setEpisodiosDe(c)}
                      >
                        Episodios
                      </button>
                    ) : (
                      <button type="button" className="pa-btn" onClick={() => setSubiendo(c)}>
                        {c.hlsPlaylistUrl ? 'Reemplazar vídeo' : 'Subir vídeo'}
                      </button>
                    )}
                    <button type="button" className="pa-btn" onClick={() => setEditando(c)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="pa-btn peligro"
                      disabled={borrando === c.id}
                      onClick={() => void borrar(c)}
                    >
                      {borrando === c.id ? '…' : 'Borrar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 && (
        <nav className="pa-paginacion" aria-label="Paginación">
          <button
            type="button"
            className="pa-btn"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => p - 1)}
          >
            Anterior
          </button>
          <span>
            {pagina} / {totalPaginas}
          </span>
          <button
            type="button"
            className="pa-btn"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </Shell>
  );
}
