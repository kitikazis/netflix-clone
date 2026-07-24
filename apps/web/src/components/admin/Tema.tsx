'use client';

import { useEffect, useState } from 'react';

const CLAVE = 'nc.tema-panel';
export type Tema = 'oscuro' | 'claro';

/**
 * Interruptor de claro/oscuro del panel.
 *
 * La elección se guarda en el navegador y se aplica marcando el elemento raíz,
 * no el propio panel: así el fondo de la página entera cambia con él y no queda
 * un borde del color anterior al desplazar.
 *
 * Por defecto, oscuro. El panel nació así —es una herramienta de trabajo, y a
 * oscuras cansa menos de noche—; el claro está para quien lo mire de día o con
 * el sol de cara, que es cuando el oscuro se vuelve un espejo.
 */
export function useTema(): [Tema, () => void] {
  // Se arranca en oscuro para que servidor y navegador pinten lo mismo; la
  // preferencia guardada se aplica justo después, ya en el cliente.
  const [tema, setTema] = useState<Tema>('oscuro');

  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'claro' || guardado === 'oscuro') setTema(guardado);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.temaPanel = tema;
    return () => {
      // Al salir del panel se quita: el catálogo tiene su propio color y no
      // debe heredar esta elección.
      delete document.documentElement.dataset.temaPanel;
    };
  }, [tema]);

  const alternar = () => {
    setTema((t) => {
      const nuevo = t === 'oscuro' ? 'claro' : 'oscuro';
      localStorage.setItem(CLAVE, nuevo);
      return nuevo;
    });
  };

  return [tema, alternar];
}

export function BotonTema({ tema, alAlternar }: { tema: Tema; alAlternar: () => void }) {
  const aOscuro = tema === 'claro';
  return (
    <button
      type="button"
      className="pa-tema"
      onClick={alAlternar}
      title={aOscuro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      aria-label={aOscuro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    >
      <span aria-hidden>{aOscuro ? '☾' : '☀'}</span>
      <span className="pa-tema-txt">{aOscuro ? 'Oscuro' : 'Claro'}</span>
    </button>
  );
}
