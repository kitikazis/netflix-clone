'use client';

import { useEffect, useState } from 'react';
import { obtenerEstadisticas, type Estadisticas } from '@/lib/admin';

interface Grupo {
  titulo: string;
  cifras: Array<{ etiqueta: string; clave: keyof Estadisticas }>;
}

const GRUPOS: Grupo[] = [
  {
    titulo: 'Cuentas',
    cifras: [
      { etiqueta: 'Usuarios', clave: 'usuarios' },
      { etiqueta: 'Administradores', clave: 'administradores' },
      { etiqueta: 'Inactivas', clave: 'inactivos' },
      { etiqueta: 'Perfiles', clave: 'perfiles' },
    ],
  },
  {
    titulo: 'Catálogo',
    cifras: [
      { etiqueta: 'Títulos', clave: 'contenido' },
      { etiqueta: 'Publicados', clave: 'publicados' },
      { etiqueta: 'Películas', clave: 'peliculas' },
      { etiqueta: 'Series', clave: 'series' },
      { etiqueta: 'Episodios', clave: 'episodios' },
      { etiqueta: 'Géneros', clave: 'generos' },
    ],
  },
  {
    titulo: 'Reproducción',
    cifras: [
      { etiqueta: 'Con vídeo listo', clave: 'transcodificados' },
      { etiqueta: 'Progresos guardados', clave: 'progresos' },
    ],
  },
];

/**
 * Cifras por tabla. No es un explorador de la base: para consultar filas en
 * bruto está el panel del proveedor de Postgres, que ya lo hace mejor. Esto
 * responde a lo que se mira a diario sin escribir SQL.
 */
export function PanelResumen() {
  const [datos, setDatos] = useState<Estadisticas | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerEstadisticas()
      .then(setDatos)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen'),
      );
  }, []);

  if (error) return <div className="form-error">{error}</div>;
  if (!datos) return <div className="vacio">Cargando…</div>;

  return (
    <div className="admin-resumen">
      {GRUPOS.map((grupo) => (
        <section key={grupo.titulo} className="admin-grupo">
          <h3 className="admin-grupo-tit">{grupo.titulo}</h3>
          <dl className="admin-cifras">
            {grupo.cifras.map(({ etiqueta, clave }) => (
              <div key={clave} className="admin-cifra">
                <dt>{etiqueta}</dt>
                <dd>{datos[clave].toLocaleString('es')}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
