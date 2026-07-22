'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { listarTabla, type TablaAdmin } from '@/lib/admin';
import type { Paginacion } from '@/lib/tipos';

const LIMITE = 25;

export interface Columna<T> {
  cabecera: string;
  /** Contenido de la celda. Devolver string o nodo ya formateado. */
  celda: (fila: T) => React.ReactNode;
  /** Aplica el estilo de rótulo (versalitas, tabular) a la columna. */
  rotulo?: boolean;
}

interface Props<T> {
  tabla: TablaAdmin;
  columnas: Array<Columna<T>>;
  /** Si se omite, no se muestra el buscador (tablas sin filtro en la API). */
  placeholderBusqueda?: string;
  vacio?: string;
}

/**
 * Tabla genérica de solo lectura para las secciones del panel que solo
 * inspeccionan datos. Evita repetir cinco veces la misma mecánica de carga,
 * búsqueda, paginación y estados.
 */
export function PanelTabla<T extends { id: string }>({
  tabla,
  columnas,
  placeholderBusqueda,
  vacio = 'No hay registros.',
}: Props<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [paginacion, setPaginacion] = useState<Paginacion | null>(null);
  const [pagina, setPagina] = useState(1);
  const [consulta, setConsulta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await listarTabla<T>(tabla, {
        pagina,
        limite: LIMITE,
        q: busqueda || undefined,
      });
      setItems(res.datos);
      setPaginacion(res.paginacion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar');
    } finally {
      setCargando(false);
    }
  }, [tabla, pagina, busqueda]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function buscar(e: FormEvent) {
    e.preventDefault();
    setPagina(1);
    setBusqueda(consulta.trim());
  }

  const totalPaginas = paginacion?.totalPaginas ?? 1;

  return (
    <>
      <div className="admin-barra">
        {placeholderBusqueda && (
          <form className="buscador" onSubmit={buscar} role="search">
            <span className="buscador-icono" aria-hidden>
              ⌕
            </span>
            <input
              className="buscador-input"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder={placeholderBusqueda}
              aria-label={placeholderBusqueda}
            />
          </form>
        )}
        {paginacion && <span className="fila-perfil">{paginacion.total} registros</span>}
      </div>

      {error && <div className="form-error">{error}</div>}

      {cargando && items.length === 0 ? (
        <div className="vacio">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="vacio">{vacio}</div>
      ) : (
        <div className="admin-tabla-marco">
          <table className="admin-tabla">
            <thead>
              <tr>
                {columnas.map((c) => (
                  <th key={c.cabecera}>{c.cabecera}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((fila) => (
                <tr key={fila.id}>
                  {columnas.map((c) => (
                    <td key={c.cabecera} className={c.rotulo ? 'admin-estado' : undefined}>
                      {c.celda(fila)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 && (
        <nav className="paginacion" aria-label="Paginación">
          <button
            type="button"
            className="btn btn-fantasma"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => p - 1)}
          >
            Anterior
          </button>
          <span className="paginacion-pos">
            {pagina} / {totalPaginas}
          </span>
          <button
            type="button"
            className="btn btn-fantasma"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </>
  );
}
