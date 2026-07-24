'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  actualizarUsuario,
  eliminarUsuario,
  listarUsuarios,
  type UsuarioAdmin,
} from '@/lib/admin';
import type { Paginacion } from '@/lib/tipos';

const LIMITE = 20;

const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });

export function PanelUsuarios() {
  const [items, setItems] = useState<UsuarioAdmin[]>([]);
  const [paginacion, setPaginacion] = useState<Paginacion | null>(null);
  const [pagina, setPagina] = useState(1);
  const [consulta, setConsulta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await listarUsuarios({ pagina, limite: LIMITE, q: busqueda || undefined });
      setItems(res.datos);
      setPaginacion(res.paginacion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las cuentas');
    } finally {
      setCargando(false);
    }
  }, [pagina, busqueda]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function buscar(e: FormEvent) {
    e.preventDefault();
    setPagina(1);
    setBusqueda(consulta.trim());
  }

  /** Las restricciones (último admin, uno mismo) las impone la API; aquí solo
      se muestra el motivo que devuelve. */
  async function cambiar(u: UsuarioAdmin, datos: { rol?: 'USUARIO' | 'ADMIN'; activo?: boolean }) {
    setOcupado(u.id);
    setError(null);
    try {
      const actualizado = await actualizarUsuario(u.id, datos);
      setItems((xs) => xs.map((x) => (x.id === u.id ? actualizado : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setOcupado(null);
    }
  }

  async function borrar(u: UsuarioAdmin) {
    if (!confirm(`¿Eliminar la cuenta ${u.correo}? Se borran sus perfiles y su progreso.`)) return;
    setOcupado(u.id);
    setError(null);
    try {
      await eliminarUsuario(u.id);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setOcupado(null);
    }
  }

  const totalPaginas = paginacion?.totalPaginas ?? 1;

  return (
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
            placeholder="Buscar por correo…"
            aria-label="Buscar cuentas"
          />
        </form>
        {paginacion && <span className="fila-perfil">{paginacion.total} cuentas</span>}
      </div>

      {error && <div className="form-error">{error}</div>}

      {cargando && items.length === 0 ? (
        <div className="vacio">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="vacio">No hay cuentas que coincidan.</div>
      ) : (
        <div className="admin-tabla-marco">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Registro</th>
                <th>Rol</th>
                <th>Perfiles</th>
                <th>Alta</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="cuenta">
                      <Avatar url={u.fotoUrl} nombre={u.nombre ?? u.correo} />
                      <div className="cuenta-txt">
                        {u.nombre && <span className="cuenta-nombre">{u.nombre}</span>}
                        <span className="cuenta-correo">{u.correo}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`pa-origen ${u.proveedor.toLowerCase()}`}>
                      {u.proveedor === 'GOOGLE' ? 'Google' : 'Correo'}
                    </span>
                  </td>
                  <td>
                    <span className={u.rol === 'ADMIN' ? 'admin-marca' : ''}>
                      {u.rol === 'ADMIN' ? 'Administrador' : 'Usuario'}
                    </span>
                  </td>
                  <td>{u.perfiles}</td>
                  <td className="admin-estado">{fecha.format(new Date(u.fechaCreacion))}</td>
                  <td>
                    <span className={u.activo ? 'admin-si' : 'admin-no'}>
                      {u.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="admin-acciones">
                    <button
                      type="button"
                      className="barra-btn"
                      disabled={ocupado === u.id}
                      onClick={() =>
                        void cambiar(u, { rol: u.rol === 'ADMIN' ? 'USUARIO' : 'ADMIN' })
                      }
                    >
                      {u.rol === 'ADMIN' ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                    <button
                      type="button"
                      className="barra-btn"
                      disabled={ocupado === u.id}
                      onClick={() => void cambiar(u, { activo: !u.activo })}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      className="barra-btn peligro"
                      disabled={ocupado === u.id}
                      onClick={() => void borrar(u)}
                    >
                      Borrar
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
  );
}

/**
 * Foto de la cuenta, o sus iniciales si no la hay.
 *
 * Va con `<img>` normal y no con el componente de Next a propósito: las fotos
 * de Google viven en dominios que cambian y habría que autorizarlos uno a uno
 * en la configuración; por una miniatura de 32 px no compensa. Si la imagen
 * falla —Google a veces las retira— se cae a las iniciales en vez de dejar el
 * hueco roto.
 */
function Avatar({ url, nombre }: { url: string | null; nombre: string }) {
  const [roto, setRoto] = useState(false);
  const iniciales = nombre
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  if (!url || roto) {
    return (
      <span className="avatar avatar-letras" aria-hidden>
        {iniciales || '?'}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="avatar"
      src={url}
      alt=""
      width={32}
      height={32}
      referrerPolicy="no-referrer"
      onError={() => setRoto(true)}
    />
  );
}
