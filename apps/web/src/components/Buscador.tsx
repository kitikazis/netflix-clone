'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_PUBLIC_URL } from '@/lib/urls';
import type { Contenido, Pagina } from '@/lib/tipos';
import { DictadoVoz } from './DictadoVoz';

/** Espera antes de consultar, para no lanzar una petición por tecla. */
const RETARDO_MS = 250;
const MAX_SUGERENCIAS = 6;
/** Por debajo de esto casi todo coincide y la lista no ayuda. */
const MINIMO_CARACTERES = 2;

interface Sugerencia {
  id: string;
  slug: string;
  titulo: string;
  anio: number | null;
}

/**
 * Buscador de la barra superior.
 *
 * Al enviar navega a /buscar?q=…, que resuelve en el servidor y deja el
 * resultado enlazable. Las sugerencias son un atajo: llevan directamente a la
 * ficha, saltándose la página de resultados.
 */
export function Buscador() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState('');
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [resaltada, setResaltada] = useState(-1);
  const contenedor = useRef<HTMLDivElement>(null);

  // Al llegar a /buscar?q=… el campo refleja lo que se está viendo.
  useEffect(() => {
    setQ(params.get('q') ?? '');
    setAbierto(false);
  }, [params]);

  // Consulta con retardo y cancelación: si el usuario sigue escribiendo, la
  // petición anterior se aborta en lugar de competir con la nueva.
  useEffect(() => {
    const termino = q.trim();
    if (termino.length < MINIMO_CARACTERES) {
      setSugerencias([]);
      return;
    }

    const control = new AbortController();
    const temporizador = window.setTimeout(async () => {
      try {
        const url = `${API_PUBLIC_URL}/catalogo/contenido?q=${encodeURIComponent(
          termino,
        )}&limite=${MAX_SUGERENCIAS}&soloTitulo=true`;
        const res = await fetch(url, { signal: control.signal });
        if (!res.ok) return;
        const { data } = (await res.json()) as { data: Pagina<Contenido> };
        setSugerencias(
          data.datos.map((c) => ({
            id: c.id,
            slug: c.slug,
            titulo: c.titulo,
            anio: c.anioLanzamiento,
          })),
        );
        setResaltada(-1);
        setAbierto(true);
      } catch {
        // Abortada o red caída: no hay nada que mostrar ni que avisar.
      }
    }, RETARDO_MS);

    return () => {
      window.clearTimeout(temporizador);
      control.abort();
    };
  }, [q]);

  // Cerrar al pulsar fuera.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  const irA = useCallback(
    (destino: string) => {
      setAbierto(false);
      router.push(destino);
    },
    [router],
  );

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (resaltada >= 0 && sugerencias[resaltada]) {
      irA(`/titulo/${sugerencias[resaltada].slug}`);
      return;
    }
    const limpio = q.trim();
    irA(limpio ? `/buscar?q=${encodeURIComponent(limpio)}` : '/buscar');
  }

  function teclas(e: React.KeyboardEvent) {
    if (!abierto || sugerencias.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setResaltada((i) => (i + 1) % sugerencias.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setResaltada((i) => (i <= 0 ? sugerencias.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setAbierto(false);
      setResaltada(-1);
    }
  }

  const listaId = 'sugerencias-buscador';

  return (
    <div className="buscador-marco" ref={contenedor}>
      <form className="buscador" onSubmit={enviar} role="search">
        <span className="buscador-icono" aria-hidden>
          ⌕
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={teclas}
          onFocus={() => sugerencias.length > 0 && setAbierto(true)}
          placeholder="Buscar título…"
          aria-label="Buscar en el catálogo"
          className="buscador-input"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={
            resaltada >= 0 ? `${listaId}-${resaltada}` : undefined
          }
        />
        <DictadoVoz
          alDictar={(texto) => {
            setQ(texto);
            irA(`/buscar?q=${encodeURIComponent(texto)}`);
          }}
        />
      </form>

      {abierto && sugerencias.length > 0 && (
        <ul className="sugerencias" id={listaId} role="listbox">
          {sugerencias.map((s, i) => (
            <li key={s.id} role="none">
              <button
                type="button"
                id={`${listaId}-${i}`}
                role="option"
                aria-selected={i === resaltada}
                className={`sugerencia ${i === resaltada ? 'resaltada' : ''}`}
                onMouseEnter={() => setResaltada(i)}
                onClick={() => irA(`/titulo/${s.slug}`)}
              >
                <span className="sugerencia-tit">{s.titulo}</span>
                {s.anio && <span className="sugerencia-anio">{s.anio}</span>}
              </button>
            </li>
          ))}
          <li role="none">
            <button
              type="button"
              className="sugerencia sugerencia-todos"
              onClick={() => irA(`/buscar?q=${encodeURIComponent(q.trim())}`)}
            >
              Ver todos los resultados
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
