'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Buscador de la barra superior. Navega a /buscar?q=… (la búsqueda se resuelve
 * en el servidor), así que el resultado es enlazable y compartible.
 */
export function Buscador() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState('');

  // Al llegar a /buscar?q=… el campo debe reflejar lo que se está viendo.
  useEffect(() => {
    setQ(params.get('q') ?? '');
  }, [params]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const limpio = q.trim();
    router.push(limpio ? `/buscar?q=${encodeURIComponent(limpio)}` : '/buscar');
  }

  return (
    <form className="buscador" onSubmit={enviar} role="search">
      <span className="buscador-icono" aria-hidden>
        ⌕
      </span>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="BUSCAR TÍTULO…"
        aria-label="Buscar en el catálogo"
        className="buscador-input"
      />
    </form>
  );
}
