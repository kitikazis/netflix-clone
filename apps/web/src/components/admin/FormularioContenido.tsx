'use client';

import { FormEvent, useState } from 'react';
import type { Contenido, Genero, TipoContenido } from '@/lib/tipos';
import { actualizarContenido, crearContenido, type DatosContenido } from '@/lib/admin';

interface Props {
  /** Si viene, se edita; si no, se crea. */
  contenido?: Contenido | null;
  generos: Genero[];
  alGuardar: (guardado: Contenido) => void;
  alCancelar: () => void;
}

/** Convierte el valor de un input numérico a número o null (nunca NaN). */
function aNumero(valor: string): number | null {
  const n = parseInt(valor, 10);
  return Number.isFinite(n) ? n : null;
}

export function FormularioContenido({ contenido, generos, alGuardar, alCancelar }: Props) {
  const editando = !!contenido;

  const [tipo, setTipo] = useState<TipoContenido>(contenido?.tipo ?? 'PELICULA');
  const [titulo, setTitulo] = useState(contenido?.titulo ?? '');
  const [sinopsis, setSinopsis] = useState(contenido?.sinopsis ?? '');
  const [anio, setAnio] = useState(contenido?.anioLanzamiento?.toString() ?? '');
  const [duracion, setDuracion] = useState(contenido?.duracionMinutos?.toString() ?? '');
  const [clasificacion, setClasificacion] = useState(contenido?.clasificacionEdad ?? '');
  const [poster, setPoster] = useState(contenido?.posterUrl ?? '');
  const [backdrop, setBackdrop] = useState(contenido?.backdropUrl ?? '');
  const [publicado, setPublicado] = useState(contenido?.publicado ?? false);
  const [destacado, setDestacado] = useState(contenido?.destacado ?? false);
  const [elegidos, setElegidos] = useState<string[]>(
    contenido?.generos?.map((g) => g.id) ?? [],
  );

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function alternarGenero(id: string) {
    setElegidos((actuales) =>
      actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id],
    );
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setError(null);
    setGuardando(true);

    const datos: DatosContenido = {
      tipo,
      titulo: titulo.trim(),
      sinopsis: sinopsis.trim() || null,
      anioLanzamiento: aNumero(anio),
      duracionMinutos: aNumero(duracion),
      clasificacionEdad: clasificacion.trim() || null,
      posterUrl: poster.trim() || null,
      backdropUrl: backdrop.trim() || null,
      publicado,
      destacado,
      generoIds: elegidos,
    };

    try {
      const guardado = editando
        ? await actualizarContenido(contenido.id, datos)
        : await crearContenido(datos);
      alGuardar(guardado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setGuardando(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={enviar}>
      <div className="admin-form-cab">
        <h2>{editando ? 'Editar título' : 'Nuevo título'}</h2>
        <button type="button" className="barra-btn" onClick={alCancelar}>
          Cancelar
        </button>
      </div>

      <div className="admin-campos">
        <label className="campo">
          <span>Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoContenido)}>
            <option value="PELICULA">Película</option>
            <option value="SERIE">Serie</option>
          </select>
        </label>

        <label className="campo admin-ancho">
          <span>Título</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={255} />
        </label>

        <label className="campo">
          <span>Año</span>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            min={1880}
            max={2100}
          />
        </label>

        <label className="campo">
          <span>Duración (min)</span>
          <input
            type="number"
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            min={1}
          />
        </label>

        <label className="campo">
          <span>Clasificación</span>
          <input
            value={clasificacion}
            onChange={(e) => setClasificacion(e.target.value)}
            placeholder="16+"
            maxLength={20}
          />
        </label>

        <label className="campo admin-ancho">
          <span>Sinopsis</span>
          <textarea value={sinopsis} onChange={(e) => setSinopsis(e.target.value)} rows={4} />
        </label>

        <label className="campo admin-ancho">
          <span>URL de la carátula</span>
          <input
            type="url"
            value={poster}
            onChange={(e) => setPoster(e.target.value)}
            placeholder="https://image.tmdb.org/t/p/w500/…"
          />
        </label>

        <label className="campo admin-ancho">
          <span>URL del fondo</span>
          <input type="url" value={backdrop} onChange={(e) => setBackdrop(e.target.value)} />
        </label>
      </div>

      {generos.length > 0 && (
        <fieldset className="admin-generos">
          <legend>Géneros</legend>
          <div className="admin-generos-lista">
            {generos.map((g) => (
              <label key={g.id} className="campo-check">
                <input
                  type="checkbox"
                  checked={elegidos.includes(g.id)}
                  onChange={() => alternarGenero(g.id)}
                />
                <span>{g.nombre}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="admin-conmutadores">
        <label className="campo-check">
          <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} />
          <span>Publicado — visible en el catálogo</span>
        </label>
        <label className="campo-check">
          <input type="checkbox" checked={destacado} onChange={(e) => setDestacado(e.target.checked)} />
          <span>Destacado — encabeza la portada</span>
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="admin-form-acciones">
        <button type="submit" className="btn btn-play" disabled={guardando || !titulo.trim()}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear título'}
        </button>
      </div>
    </form>
  );
}
