'use client';

import { useEffect, useRef, useState } from 'react';
import type { Level } from 'hls.js';

export const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

interface Props {
  video: HTMLVideoElement | null;
  niveles: Level[];
  nivel: number;
  alCambiarNivel: (indice: number) => void;
  contenedor: HTMLElement | null;
  siguienteHref?: string;
}

function reloj(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** Etiqueta de una variante: "1080p" y, si es la mayor, marcada como máxima. */
function etiquetaNivel(n: Level, esMaxima: boolean): string {
  const base = n.height ? `${n.height}p` : `${Math.round(n.bitrate / 1000)} kbps`;
  return esMaxima ? `${base} · máxima` : base;
}

/**
 * Controles propios del reproductor.
 *
 * Se sustituyen los nativos porque los del navegador no permiten exponer la
 * escalera de calidades de HLS —que es cosa de hls.js, no del elemento
 * <video>— ni mantener una estética coherente con el resto del sitio.
 */
export function Controles({
  video,
  niveles,
  nivel,
  alCambiarNivel,
  contenedor,
  siguienteHref,
}: Props) {
  const [reproduciendo, setReproduciendo] = useState(false);
  const [actual, setActual] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [cargado, setCargado] = useState(0);
  const [volumen, setVolumen] = useState(1);
  const [silenciado, setSilenciado] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [menu, setMenu] = useState<'ninguno' | 'calidad' | 'velocidad'>('ninguno');
  const [visible, setVisible] = useState(true);
  const [cargando, setCargando] = useState(false);
  const ocultar = useRef<number | null>(null);

  // --- Estado del vídeo ---
  useEffect(() => {
    if (!video) return;
    const tiempo = () => setActual(video.currentTime);
    const meta = () => setDuracion(video.duration || 0);
    const play = () => setReproduciendo(true);
    const pause = () => setReproduciendo(false);
    const vol = () => {
      setVolumen(video.volume);
      setSilenciado(video.muted);
    };
    const buffer = () => {
      if (video.buffered.length > 0) {
        setCargado(video.buffered.end(video.buffered.length - 1));
      }
    };
    const esperando = () => setCargando(true);
    const listo = () => setCargando(false);

    video.addEventListener('timeupdate', tiempo);
    video.addEventListener('loadedmetadata', meta);
    video.addEventListener('durationchange', meta);
    video.addEventListener('play', play);
    video.addEventListener('pause', pause);
    video.addEventListener('volumechange', vol);
    video.addEventListener('progress', buffer);
    video.addEventListener('waiting', esperando);
    video.addEventListener('playing', listo);
    video.addEventListener('canplay', listo);
    return () => {
      video.removeEventListener('timeupdate', tiempo);
      video.removeEventListener('loadedmetadata', meta);
      video.removeEventListener('durationchange', meta);
      video.removeEventListener('play', play);
      video.removeEventListener('pause', pause);
      video.removeEventListener('volumechange', vol);
      video.removeEventListener('progress', buffer);
      video.removeEventListener('waiting', esperando);
      video.removeEventListener('playing', listo);
      video.removeEventListener('canplay', listo);
    };
  }, [video]);

  useEffect(() => {
    const cambio = () => setPantallaCompleta(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', cambio);
    return () => document.removeEventListener('fullscreenchange', cambio);
  }, []);

  // Los controles se esconden mientras se reproduce y no hay menús abiertos.
  useEffect(() => {
    if (!contenedor) return;
    const despertar = () => {
      setVisible(true);
      if (ocultar.current) window.clearTimeout(ocultar.current);
      if (reproduciendo && menu === 'ninguno') {
        ocultar.current = window.setTimeout(() => setVisible(false), 2800);
      }
    };
    despertar();
    contenedor.addEventListener('mousemove', despertar);
    contenedor.addEventListener('touchstart', despertar);
    return () => {
      contenedor.removeEventListener('mousemove', despertar);
      contenedor.removeEventListener('touchstart', despertar);
      if (ocultar.current) window.clearTimeout(ocultar.current);
    };
  }, [contenedor, reproduciendo, menu]);

  if (!video) return null;

  const alternar = () => {
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  };

  const buscar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const destino = (Number(e.target.value) / 1000) * duracion;
    video.currentTime = destino;
    setActual(destino);
  };

  const cambiarVelocidad = (v: number) => {
    video.playbackRate = v;
    setVelocidad(v);
    setMenu('ninguno');
  };

  const pantalla = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void contenedor?.requestFullscreen().catch(() => undefined);
  };

  const progreso = duracion > 0 ? (actual / duracion) * 1000 : 0;
  const bufferPct = duracion > 0 ? (cargado / duracion) * 100 : 0;
  const indiceMaximo = niveles.length - 1;

  return (
    <>
      {cargando && <div className="rep-cargando" aria-label="Cargando" />}

      {/* Capa para reproducir/pausar tocando el vídeo */}
      <button
        type="button"
        className="rep-capa"
        onClick={alternar}
        onDoubleClick={pantalla}
        aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
        tabIndex={-1}
      />

      {!reproduciendo && !cargando && (
        <button type="button" className="rep-play-grande" onClick={alternar} aria-label="Reproducir">
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden>
            <path fill="currentColor" d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      <div className={`rep-controles ${visible ? '' : 'oculto'}`}>
        <div className="rep-barra-tiempo">
          <div className="rep-buffer" style={{ width: `${bufferPct}%` }} aria-hidden />
          <input
            type="range"
            min={0}
            max={1000}
            value={progreso}
            onChange={buscar}
            className="rep-scrubber"
            aria-label="Posición"
            style={{ ['--avance' as string]: `${progreso / 10}%` }}
          />
        </div>

        <div className="rep-fila">
          <button type="button" className="rep-btn" onClick={alternar} aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}>
            {reproduciendo ? (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="rep-btn"
            onClick={() => (video.currentTime = Math.max(0, video.currentTime - 10))}
            aria-label="Retroceder 10 segundos"
          >
            <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden>
              <path fill="currentColor" d="M12 5V1L7 6l5 5V7a6 6 0 11-6 6H4a8 8 0 108-8z" />
            </svg>
          </button>

          <button
            type="button"
            className="rep-btn"
            onClick={() => (video.currentTime = Math.min(duracion, video.currentTime + 10))}
            aria-label="Avanzar 10 segundos"
          >
            <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden style={{ transform: 'scaleX(-1)' }}>
              <path fill="currentColor" d="M12 5V1L7 6l5 5V7a6 6 0 11-6 6H4a8 8 0 108-8z" />
            </svg>
          </button>

          <div className="rep-volumen">
            <button
              type="button"
              className="rep-btn"
              onClick={() => (video.muted = !video.muted)}
              aria-label={silenciado ? 'Activar sonido' : 'Silenciar'}
            >
              <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden>
                <path
                  fill="currentColor"
                  d={
                    silenciado || volumen === 0
                      ? 'M16.5 12l3.5 3.5-1.4 1.4L15 13.4l-3.5 3.5-1.4-1.4L13.6 12l-3.5-3.5L11.5 7 15 10.6 18.6 7 20 8.5zM3 9h3l4-4v14l-4-4H3z'
                      : 'M3 9h3l5-5v16l-5-5H3zm12.5 3a4 4 0 00-2-3.5v7a4 4 0 002-3.5zm-2-7.7v2.1a6 6 0 010 11.2v2.1a8 8 0 000-15.4z'
                  }
                />
              </svg>
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={silenciado ? 0 : volumen * 100}
              onChange={(e) => {
                video.volume = Number(e.target.value) / 100;
                video.muted = Number(e.target.value) === 0;
              }}
              className="rep-vol-slider"
              aria-label="Volumen"
            />
          </div>

          <span className="rep-tiempo">
            {reloj(actual)} <span className="rep-sep">/</span> {reloj(duracion)}
          </span>

          <div className="rep-derecha">
            <div className="rep-menu-marco">
              <button
                type="button"
                className={`rep-btn rep-texto ${menu === 'velocidad' ? 'activo' : ''}`}
                onClick={() => setMenu(menu === 'velocidad' ? 'ninguno' : 'velocidad')}
                aria-haspopup="menu"
                aria-expanded={menu === 'velocidad'}
              >
                {velocidad}×
              </button>
              {menu === 'velocidad' && (
                <ul className="rep-menu" role="menu">
                  {VELOCIDADES.map((v) => (
                    <li key={v} role="none">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={velocidad === v}
                        className={velocidad === v ? 'activo' : ''}
                        onClick={() => cambiarVelocidad(v)}
                      >
                        {v === 1 ? 'Normal' : `${v}×`}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {niveles.length > 0 && (
              <div className="rep-menu-marco">
                <button
                  type="button"
                  className={`rep-btn rep-texto ${menu === 'calidad' ? 'activo' : ''}`}
                  onClick={() => setMenu(menu === 'calidad' ? 'ninguno' : 'calidad')}
                  aria-haspopup="menu"
                  aria-expanded={menu === 'calidad'}
                >
                  {nivel === -1
                    ? 'Auto'
                    : etiquetaNivel(niveles[nivel] ?? niveles[0], nivel === indiceMaximo)}
                </button>
                {menu === 'calidad' && (
                  <ul className="rep-menu" role="menu">
                    <li role="none">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={nivel === -1}
                        className={nivel === -1 ? 'activo' : ''}
                        onClick={() => {
                          alCambiarNivel(-1);
                          setMenu('ninguno');
                        }}
                      >
                        Automática
                      </button>
                    </li>
                    {/* De mayor a menor: quien abre esto suele buscar la máxima. */}
                    {niveles
                      .map((n, i) => ({ n, i }))
                      .reverse()
                      .map(({ n, i }) => (
                        <li key={i} role="none">
                          <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={nivel === i}
                            className={nivel === i ? 'activo' : ''}
                            onClick={() => {
                              alCambiarNivel(i);
                              setMenu('ninguno');
                            }}
                          >
                            {etiquetaNivel(n, i === indiceMaximo)}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            {siguienteHref && (
              <a className="rep-btn rep-texto" href={siguienteHref} aria-label="Siguiente episodio">
                Siguiente
              </a>
            )}

            <button
              type="button"
              className="rep-btn"
              onClick={pantalla}
              aria-label={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden>
                <path
                  fill="currentColor"
                  d={
                    pantallaCompleta
                      ? 'M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z'
                      : 'M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z'
                  }
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
