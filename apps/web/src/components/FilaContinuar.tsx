'use client';

import { useCallback, useEffect, useState } from 'react';
import { PortadaVHS } from './PortadaVHS';
import { obtenerContinuarViendo, quitarDeContinuar, useSesion } from '@/lib/sesion';
import type { ItemContinuar } from '@/lib/tipos';

function claveDe(item: ItemContinuar): string {
  return `${item.contenido.id}:${item.episodio?.id ?? '_'}`;
}

/** Fila "continuar viendo" del perfil activo. Se oculta si está vacía. */
export function FilaContinuar() {
  const sesion = useSesion();
  const [items, setItems] = useState<ItemContinuar[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!sesion?.token) {
      setItems([]);
      return;
    }
    let vivo = true;
    setCargando(true);
    obtenerContinuarViendo()
      .then((res) => vivo && setItems(res))
      .catch(() => vivo && setItems([]))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [sesion?.token]);

  const quitar = useCallback(async (item: ItemContinuar) => {
    const clave = claveDe(item);
    const previos = items;
    // Optimista: la fila reacciona al instante y se revierte si la API falla.
    setItems((actuales) => actuales.filter((i) => claveDe(i) !== clave));
    try {
      await quitarDeContinuar(item.contenido.id, item.episodio?.id);
    } catch {
      setItems(previos);
    }
  }, [items]);

  if (!sesion?.token || (!cargando && items.length === 0)) return null;

  return (
    <section className="fila">
      <div className="fila-cab">
        <span>▶ CONTINUAR VIENDO</span>
        <span className="fila-perfil">{sesion.perfilActivo?.nombre}</span>
      </div>
      <div className="carrusel">
        {items.map((item) => {
          const ep = item.episodio;
          const href = ep
            ? `/ver/${item.contenido.slug}?episodio=${ep.id}`
            : `/ver/${item.contenido.slug}`;
          return (
            <PortadaVHS
              key={claveDe(item)}
              slug={item.contenido.slug}
              titulo={item.contenido.titulo}
              tipo={item.contenido.tipo}
              posterUrl={item.contenido.posterUrl}
              porcentaje={item.porcentaje}
              href={href}
              subtitulo={ep ? `T${ep.temporada} · E${ep.numeroEpisodio}` : undefined}
              alQuitar={() => void quitar(item)}
            />
          );
        })}
      </div>
    </section>
  );
}
