'use client';

import { useEffect, useRef, useState } from 'react';
import type { Level } from 'hls.js';
import { MenuAjustes, type Subtitulo } from './MenuAjustes';

interface Props {
  video: HTMLVideoElement | null;
  niveles: Level[];
  nivel: number;
  nivelReal: number;
  alCambiarNivel: (indice: number) => void;
  contenedor: HTMLElement | null;
  siguienteHref?: string;
  ambiental: boolean;
  alCambiarAmbiental: (v: boolean) => void;
}

function reloj(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
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
  nivelReal,
  alCambiarNivel,
  contenedor,
  siguienteHref,
  ambiental,
  alCambiarAmbiental,
}: Props) {
  const [reproduciendo, setReproduciendo] = useState(false);
  const [actual, setActual] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [cargado, setCargado] = useState(0);
  const [volumen, setVolumen] = useState(1);
  const [silenciado, setSilenciado] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [subtitulos, setSubtitulos] = useState<Subtitulo[]>([]);
  const [subtituloActivo, setSubtituloActivo] = useState(-1);
  const [temporizador, setTemporizador] = useState<number | null>(null);
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

  // Pistas de subtítulos: con HLS las anuncia el manifiesto, así que pueden
  // aparecer después de cargar el vídeo.
  useEffect(() => {
    if (!video) return;
    const leer = () => {
      const pistas = Array.from(video.textTracks).filter(
        (p) => p.kind === 'subtitles' || p.kind === 'captions',
      );
      setSubtitulos(pistas.map((p, i) => ({ id: i, etiqueta: p.label || p.language || `Pista ${i + 1}` })));
    };
    leer();
    video.textTracks.addEventListener('addtrack', leer);
    video.textTracks.addEventListener('removetrack', leer);
    return () => {
      video.textTracks.removeEventListener('addtrack', leer);
      video.textTracks.removeEventListener('removetrack', leer);
    };
  }, [video]);

  /** Temporizador: `0` significa "hasta que acabe el vídeo". */
  useEffect(() => {
    if (!video || temporizador === null || temporizador === 0) return;
    const t = window.setTimeout(() => {
      video.pause();
      setTemporizador(null);
    }, temporizador * 60_000);
    return () => window.clearTimeout(t);
  }, [video, temporizador]);

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
      if (reproduciendo && !ajustes) {
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
  }, [contenedor, reproduciendo, ajustes]);

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
  };

  const cambiarSubtitulo = (id: number) => {
    Array.from(video.textTracks).forEach((p, i) => {
      p.mode = i === id ? 'showing' : 'disabled';
    });
    setSubtituloActivo(id);
  };

  const pantalla = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void contenedor?.requestFullscreen().catch(() => undefined);
  };

  const progreso = duracion > 0 ? (actual / duracion) * 1000 : 0;
  const bufferPct = duracion > 0 ? (cargado / duracion) * 100 : 0;

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
                className={`rep-btn ${ajustes ? 'activo' : ''}`}
                onClick={() => setAjustes(!ajustes)}
                aria-haspopup="menu"
                aria-expanded={ajustes}
                aria-label="Ajustes"
              >
                <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M19.4 13a7.8 7.8 0 000-2l2.1-1.6a.5.5 0 00.1-.6l-2-3.5a.5.5 0 00-.6-.2l-2.5 1a7.3 7.3 0 00-1.7-1l-.4-2.6a.5.5 0 00-.5-.4h-4a.5.5 0 00-.5.4l-.4 2.6a7.3 7.3 0 00-1.7 1l-2.5-1a.5.5 0 00-.6.2l-2 3.5a.5.5 0 00.1.6L4.6 11a7.8 7.8 0 000 2l-2.1 1.6a.5.5 0 00-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.6c0 .2.2.4.5.4h4c.3 0 .5-.2.5-.4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.5a.5.5 0 00-.1-.6zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z"
                  />
                </svg>
              </button>
              {ajustes && (
                <MenuAjustes
                  niveles={niveles}
                  nivel={nivel}
                  nivelReal={nivelReal}
                  alCambiarNivel={alCambiarNivel}
                  velocidad={velocidad}
                  alCambiarVelocidad={cambiarVelocidad}
                  subtitulos={subtitulos}
                  subtituloActivo={subtituloActivo}
                  alCambiarSubtitulo={cambiarSubtitulo}
                  ambiental={ambiental}
                  alCambiarAmbiental={alCambiarAmbiental}
                  temporizador={temporizador}
                  alCambiarTemporizador={setTemporizador}
                  alCerrar={() => setAjustes(false)}
                />
              )}
            </div>

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
