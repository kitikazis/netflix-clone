'use client';

import { useEffect, useState } from 'react';
import type { Level } from 'hls.js';

export const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
/** Minutos del temporizador. `0` = hasta que acabe el vídeo. */
export const TEMPORIZADORES = [10, 15, 30, 45, 60, 0];

export interface Subtitulo {
  id: number;
  etiqueta: string;
}

interface Props {
  niveles: Level[];
  nivel: number;
  nivelReal: number;
  alCambiarNivel: (i: number) => void;
  velocidad: number;
  alCambiarVelocidad: (v: number) => void;
  subtitulos: Subtitulo[];
  subtituloActivo: number;
  alCambiarSubtitulo: (id: number) => void;
  ambiental: boolean;
  alCambiarAmbiental: (v: boolean) => void;
  temporizador: number | null;
  alCambiarTemporizador: (min: number | null) => void;
  alCerrar: () => void;
}

type Pagina = 'raiz' | 'calidad' | 'velocidad' | 'subtitulos' | 'temporizador';

function etiquetaNivel(n: Level | undefined): string {
  if (!n) return '—';
  return n.height ? `${n.height}p` : `${Math.round(n.bitrate / 1000)} kbps`;
}

/**
 * Menú de ajustes del reproductor.
 *
 * Se agrupa todo bajo un engranaje en lugar de repartir botones por la barra:
 * con calidad, velocidad, subtítulos, temporizador e iluminación, media docena
 * de controles sueltos taparían el vídeo, que es lo que se ha venido a ver.
 */
export function MenuAjustes({
  niveles,
  nivel,
  nivelReal,
  alCambiarNivel,
  velocidad,
  alCambiarVelocidad,
  subtitulos,
  subtituloActivo,
  alCambiarSubtitulo,
  ambiental,
  alCambiarAmbiental,
  temporizador,
  alCambiarTemporizador,
  alCerrar,
}: Props) {
  const [pagina, setPagina] = useState<Pagina>('raiz');

  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (pagina === 'raiz') alCerrar();
      else setPagina('raiz');
    };
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [pagina, alCerrar]);

  const indiceMaximo = niveles.length - 1;
  /**
   * Sin variantes es que se está reproduciendo por la vía nativa del navegador:
   * Safari e iOS no tienen Media Source Extensions, así que hls.js no puede
   * funcionar y el sistema elige la calidad por su cuenta. La fila se desactiva
   * igual, pero diciendo por qué: en gris y sin explicación se lee como roto,
   * que es justo lo que ya pasó una vez.
   */
  const sinControlDeCalidad = niveles.length === 0;
  const resumenCalidad = sinControlDeCalidad
    ? 'La ajusta el dispositivo'
    : nivel === -1
      ? `Automática${nivelReal >= 0 ? ` (${etiquetaNivel(niveles[nivelReal])})` : ''}`
      : etiquetaNivel(niveles[nivel]);
  const resumenVelocidad = velocidad === 1 ? 'Normal' : `${velocidad}×`;
  const resumenSubtitulos =
    subtitulos.length === 0
      ? 'No disponibles'
      : subtituloActivo === -1
        ? 'Desactivados'
        : (subtitulos.find((s) => s.id === subtituloActivo)?.etiqueta ?? 'Activados');
  const resumenTemporizador =
    temporizador === null ? 'No' : temporizador === 0 ? 'Fin del vídeo' : `${temporizador} min`;

  if (pagina !== 'raiz') {
    const titulos: Record<Exclude<Pagina, 'raiz'>, string> = {
      calidad: 'Calidad',
      velocidad: 'Velocidad de reproducción',
      subtitulos: 'Subtítulos',
      temporizador: 'Temporizador de apagado',
    };
    return (
      <div className="rep-ajustes" role="menu">
        <button type="button" className="rep-ajustes-volver" onClick={() => setPagina('raiz')}>
          <span aria-hidden>‹</span> {titulos[pagina]}
        </button>
        <div className="rep-ajustes-lista">
          {pagina === 'calidad' && (
            <>
              <Opcion
                activa={nivel === -1}
                onClick={() => {
                  alCambiarNivel(-1);
                  setPagina('raiz');
                }}
              >
                Automática
              </Opcion>
              {/* De mayor a menor: quien abre esto suele ir a por la mejor. */}
              {niveles
                .map((n, i) => ({ n, i }))
                .reverse()
                .map(({ n, i }) => (
                  <Opcion
                    key={i}
                    activa={nivel === i}
                    onClick={() => {
                      alCambiarNivel(i);
                      setPagina('raiz');
                    }}
                  >
                    {etiquetaNivel(n)}
                    {i === indiceMaximo && <span className="rep-insignia">máxima</span>}
                  </Opcion>
                ))}
            </>
          )}

          {pagina === 'velocidad' &&
            VELOCIDADES.map((v) => (
              <Opcion
                key={v}
                activa={velocidad === v}
                onClick={() => {
                  alCambiarVelocidad(v);
                  setPagina('raiz');
                }}
              >
                {v === 1 ? 'Normal' : `${v}×`}
              </Opcion>
            ))}

          {pagina === 'subtitulos' && (
            <>
              <Opcion
                activa={subtituloActivo === -1}
                onClick={() => {
                  alCambiarSubtitulo(-1);
                  setPagina('raiz');
                }}
              >
                Desactivados
              </Opcion>
              {subtitulos.map((s) => (
                <Opcion
                  key={s.id}
                  activa={subtituloActivo === s.id}
                  onClick={() => {
                    alCambiarSubtitulo(s.id);
                    setPagina('raiz');
                  }}
                >
                  {s.etiqueta}
                </Opcion>
              ))}
              {subtitulos.length === 0 && (
                <p className="rep-ajustes-nota">Este título no incluye subtítulos.</p>
              )}
            </>
          )}

          {pagina === 'temporizador' && (
            <>
              <Opcion
                activa={temporizador === null}
                onClick={() => {
                  alCambiarTemporizador(null);
                  setPagina('raiz');
                }}
              >
                No
              </Opcion>
              {TEMPORIZADORES.map((m) => (
                <Opcion
                  key={m}
                  activa={temporizador === m}
                  onClick={() => {
                    alCambiarTemporizador(m);
                    setPagina('raiz');
                  }}
                >
                  {m === 0 ? 'Fin del vídeo' : `${m} minutos`}
                </Opcion>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rep-ajustes" role="menu">
      <div className="rep-ajustes-lista">
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={ambiental}
          className="rep-ajustes-fila"
          onClick={() => alCambiarAmbiental(!ambiental)}
        >
          <span className="rep-ajustes-eti">Iluminación cinematográfica</span>
          <span className={`rep-interruptor ${ambiental ? 'on' : ''}`} aria-hidden />
        </button>

        <Fila
          etiqueta="Subtítulos"
          valor={resumenSubtitulos}
          desactivada={subtitulos.length === 0}
          onClick={() => setPagina('subtitulos')}
        />
        <Fila
          etiqueta="Temporizador de apagado"
          valor={resumenTemporizador}
          onClick={() => setPagina('temporizador')}
        />
        <Fila
          etiqueta="Velocidad de reproducción"
          valor={resumenVelocidad}
          onClick={() => setPagina('velocidad')}
        />
        <Fila
          etiqueta="Calidad"
          valor={resumenCalidad}
          desactivada={sinControlDeCalidad}
          onClick={() => setPagina('calidad')}
        />
      </div>
    </div>
  );
}

function Fila({
  etiqueta,
  valor,
  onClick,
  desactivada,
}: {
  etiqueta: string;
  valor: string;
  onClick: () => void;
  desactivada?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="rep-ajustes-fila"
      onClick={onClick}
      disabled={desactivada}
    >
      <span className="rep-ajustes-eti">{etiqueta}</span>
      <span className="rep-ajustes-val">
        {valor} <span aria-hidden>›</span>
      </span>
    </button>
  );
}

function Opcion({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={activa}
      className={`rep-ajustes-opcion ${activa ? 'activa' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
