'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { listarTabla, type TablaAdmin } from '@/lib/admin';
import type { Paginacion } from '@/lib/tipos';

const LIMITE = 25;

export interface Columna<T> {
  cabecera: string;
  /**
   * Valor por el que ordenar al pulsar la cabecera.
   *
   * Va aparte de `celda` porque lo que se pinta y lo que se compara rara vez
   * coinciden: una fecha se enseña como «23 jul 2026» y ordenarla como texto
   * pondría abril antes que enero. Sin esto, la columna no es ordenable.
   */
  valor?: (fila: T) => string | number | null;
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

  /**
   * Orden por columna.
   *
   * Se ordena la página que ya está en pantalla, no el conjunto: el listado
   * viene paginado de la API y ordenar solo estas filas es honesto —lo que se
   * ve, ordenado— mientras que fingir un orden global exigiría que ordenara
   * el servidor. Si algún día hace falta, se le pasa el criterio en la consulta.
   */
  const [orden, setOrden] = useState<{ columna: string; asc: boolean } | null>(null);

  const ordenarPor = (columna: string) =>
    setOrden((o) => (o?.columna === columna ? { columna, asc: !o.asc } : { columna, asc: true }));

  const ordenados = (() => {
    const col = columnas.find((c) => c.cabecera === orden?.columna);
    if (!orden || !col?.valor) return items;
    const dir = orden.asc ? 1 : -1;
    return [...items].sort((a, b) => {
      const x = col.valor!(a);
      const y = col.valor!(b);
      // Los vacíos al final siempre, se ordene como se ordene: son ausencia de
      // dato, no un valor pequeño.
      if (x === null || x === undefined || x === '') return 1;
      if (y === null || y === undefined || y === '') return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x).localeCompare(String(y), 'es', { numeric: true }) * dir;
    });
  })();
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
                {columnas.map((c) => {
                  if (!c.valor) return <th key={c.cabecera}>{c.cabecera}</th>;
                  const activa = orden?.columna === c.cabecera;
                  return (
                    <th key={c.cabecera} aria-sort={activa ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" className="pa-orden" onClick={() => ordenarPor(c.cabecera)}>
                        {c.cabecera}
                        <span className="pa-orden-flecha" aria-hidden>
                          {activa ? (orden.asc ? '▲' : '▼') : '⇅'}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ordenados.map((fila) => (
                <tr key={fila.id}>
                  {/* `data-etiqueta` lleva el nombre de la columna en el propio
                      dato: en móvil la tabla se apila en fichas y cada celda
                      necesita decir de qué es, sin cabecera que la encabece. */}
                  {columnas.map((c) => (
                    <td
                      key={c.cabecera}
                      data-etiqueta={c.cabecera}
                      className={c.rotulo ? 'admin-estado' : undefined}
                    >
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
