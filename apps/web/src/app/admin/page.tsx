'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useEsAdmin, useSesion } from '@/lib/sesion';
import {
  eliminarContenido,
  listarContenido,
  listarGeneros,
  type FiltrosAdmin,
} from '@/lib/admin';
import type { Contenido, Genero, Paginacion } from '@/lib/tipos';
import { FormularioContenido } from '@/components/admin/FormularioContenido';
import { PanelUsuarios } from '@/components/admin/PanelUsuarios';
import { PanelResumen } from '@/components/admin/PanelResumen';

const LIMITE = 20;

type Pestana = 'catalogo' | 'usuarios' | 'resumen';

export default function Admin() {
  const sesion = useSesion();
  const esAdmin = useEsAdmin();

  const [items, setItems] = useState<Contenido[]>([]);
  const [paginacion, setPaginacion] = useState<Paginacion | null>(null);
  const [generos, setGeneros] = useState<Genero[]>([]);
  const [pagina, setPagina] = useState(1);
  const [consulta, setConsulta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [soloBorradores, setSoloBorradores] = useState(false);

  const [editando, setEditando] = useState<Contenido | null>(null);
  const [creando, setCreando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('catalogo');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const filtros: FiltrosAdmin = { pagina, limite: LIMITE };
      if (busqueda) filtros.q = busqueda;
      // El listado de administración devuelve todo; para ver solo los
      // borradores hay que pedir explícitamente publicado=false.
      if (soloBorradores) filtros.publicado = false;
      const res = await listarContenido(filtros);
      setItems(res.datos);
      setPaginacion(res.paginacion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo');
    } finally {
      setCargando(false);
    }
  }, [pagina, busqueda, soloBorradores]);

  useEffect(() => {
    if (esAdmin && pestana === 'catalogo') void cargar();
  }, [esAdmin, pestana, cargar]);

  useEffect(() => {
    if (!esAdmin) return;
    listarGeneros()
      .then(setGeneros)
      .catch(() => setGeneros([]));
  }, [esAdmin]);

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

  // --- Accesos denegados ---
  if (!sesion) {
    return (
      <div className="entrar">
        <div className="panel">
          <div className="panel-cab">Administración</div>
          <p className="panel-txt">Necesitas iniciar sesión.</p>
          <Link href="/entrar" className="btn btn-play">
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  if (!esAdmin) {
    return (
      <div className="entrar">
        <div className="panel">
          <div className="panel-cab">Sin permiso</div>
          <p className="panel-txt">
            Esta sección es solo para cuentas con rol de administrador.
          </p>
          <Link href="/" className="btn btn-fantasma">
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  // --- Formulario ---
  if (creando || editando) {
    return (
      <div className="catalogo">
        <FormularioContenido
          contenido={editando}
          generos={generos}
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
      </div>
    );
  }

  const totalPaginas = paginacion?.totalPaginas ?? 1;

  return (
    <div className="catalogo">
      <section className="fila">
        <div className="fila-cab">
          <span>Administración</span>
          <nav className="admin-pestanas">
            {(
              [
                ['catalogo', 'Catálogo'],
                ['usuarios', 'Cuentas'],
                ['resumen', 'Resumen'],
              ] as Array<[Pestana, string]>
            ).map(([clave, etiqueta]) => (
              <button
                key={clave}
                type="button"
                className={`filtro ${pestana === clave ? 'activo' : ''}`}
                aria-current={pestana === clave ? 'page' : undefined}
                onClick={() => setPestana(clave)}
              >
                {etiqueta}
              </button>
            ))}
          </nav>
        </div>

        {pestana === 'usuarios' && <PanelUsuarios />}
        {pestana === 'resumen' && <PanelResumen />}
        {pestana === 'catalogo' && (
        <>

        <div className="admin-barra">
          <form className="buscador" onSubmit={buscar} role="search">
            <span className="buscador-icono" aria-hidden>
              ⌕
            </span>
            <input
              className="buscador-input"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Buscar por título…"
              aria-label="Buscar en el catálogo"
            />
          </form>

          <label className="campo-check">
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

          <button type="button" className="btn btn-play" onClick={() => setCreando(true)}>
            Nuevo título
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

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
                      <span className={c.publicado ? 'admin-si' : 'admin-no'}>
                        {c.publicado ? 'Publicado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="admin-estado">{c.estadoProcesamiento}</td>
                    <td className="admin-acciones">
                      <button
                        type="button"
                        className="barra-btn"
                        onClick={() => setEditando(c)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="barra-btn peligro"
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
        )}
      </section>
    </div>
  );
}
