'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Hls, { type Level } from 'hls.js';
import { guardarProgreso, obtenerPosicion, useSesion } from '@/lib/sesion';
import { Controles } from './reproductor/Controles';
import { HaloAmbiental } from './reproductor/HaloAmbiental';

export interface EnlaceSiguiente {
  href: string;
  etiqueta: string;
}

interface Props {
  src: string | null; // URL del master.m3u8 ya resuelta
  contenidoId: string;
  episodioId?: string;
  duracionSegundos?: number | null;
  poster?: string | null;
  /** Episodio siguiente; habilita el autoplay al terminar. */
  siguiente?: EnlaceSiguiente | null;
}

const INTERVALO_LATIDO_MS = 10_000;
const SALTO_SEG = 10;
const SEGUNDOS_CUENTA_ATRAS = 8;
/** Por debajo de esto no merece la pena reanudar: es el principio. */
const MINIMO_REANUDAR_SEG = 5;

function formatear(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const mm = `${m}`.padStart(2, '0');
  const ss = `${s}`.padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Reproductor HLS (hls.js, con fallback nativo en Safari). Reanuda desde la
 * última posición del perfil, emite latidos de progreso, permite elegir calidad
 * y encadena con el episodio siguiente.
 */
export function ReproductorHls({
  src,
  contenidoId,
  episodioId,
  duracionSegundos,
  poster,
  siguiente,
}: Props) {
  const sesion = useSesion();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  // Además del ref, en estado: los controles necesitan re-renderizar cuando el
  // elemento existe, y un ref no dispara render.
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [contenedorEl, setContenedorEl] = useState<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const posicionInicial = useRef(0);

  const [error, setError] = useState<string | null>(null);
  const [niveles, setNiveles] = useState<Level[]>([]);
  const [nivel, setNivel] = useState(-1); // -1 = automático
  // Variante que suena de hecho. En modo automático `nivel` vale -1, pero hay
  // que poder enseñar cuál está eligiendo hls.js: "Automática (696p)".
  const [nivelReal, setNivelReal] = useState(-1);
  const [ambiental, setAmbiental] = useState(true);
  const [reanudadoEn, setReanudadoEn] = useState<number | null>(null);
  const [cuentaAtras, setCuentaAtras] = useState<number | null>(null);

  const conPerfil = !!sesion?.token;

  // --- Carga del stream HLS ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    setNiveles([]);
    setNivel(-1);

    let hls: Hls | null = null;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src; // Safari / iOS: HLS nativo (la calidad la gestiona el SO)
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => setNiveles(data.levels));
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        setNivelReal(data.level);
        // Solo refleja el cambio en modo automático; en manual ya lo fijó el usuario.
        if (hls && hls.autoLevelEnabled) setNivel(-1);
        else setNivel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        // Los fallos fatales de red y de media suelen ser recuperables sin
        // recargar: merece la pena intentarlo antes de rendirse.
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls?.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
        } else {
          setError('Error al cargar el stream HLS');
          hls?.destroy();
        }
      });
    } else {
      setError('Tu navegador no soporta HLS');
    }

    return () => {
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  // --- Latidos de progreso ---
  const enviarLatido = useCallback(
    (alSalir = false) => {
      const video = videoRef.current;
      if (!video) return;
      const duracionTotal = Math.floor(video.duration || duracionSegundos || 0);
      const segundoActual = Math.floor(video.currentTime);
      if (duracionTotal <= 0 || segundoActual <= 0) return;
      // Nunca se deja escapar el rechazo: un latido perdido no debe ensuciar la
      // consola ni romper nada visible.
      void guardarProgreso(
        { contenidoId, episodioId, segundoActual, duracionTotal },
        alSalir,
      ).catch(() => undefined);
    },
    [contenidoId, episodioId, duracionSegundos],
  );

  // --- Reanudación desde la última posición del perfil ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || !conPerfil) return;

    let vivo = true;
    posicionInicial.current = 0;
    setReanudadoEn(null);

    const aplicar = () => {
      const objetivo = posicionInicial.current;
      if (objetivo <= 0 || !video.duration) return;
      video.currentTime = Math.min(objetivo, video.duration - 1);
    };

    obtenerPosicion(contenidoId, episodioId)
      .then((pos) => {
        // Si ya está completo se empieza de cero: es un revisionado.
        if (!vivo || !pos || pos.completado || pos.segundoActual <= MINIMO_REANUDAR_SEG) {
          return;
        }
        posicionInicial.current = pos.segundoActual;
        setReanudadoEn(pos.segundoActual);
        if (video.readyState >= 1) aplicar();
      })
      .catch(() => undefined);

    video.addEventListener('loadedmetadata', aplicar);
    return () => {
      vivo = false;
      video.removeEventListener('loadedmetadata', aplicar);
    };
  }, [src, conPerfil, contenidoId, episodioId]);

  // --- Emisión de latidos: periódico, al pausar, al terminar y al salir ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || !conPerfil) return;

    const alPausar = () => enviarLatido();
    const alTerminar = () => enviarLatido();

    // `visibilitychange` es el único evento fiable en móvil (donde `beforeunload`
    // no dispara al cerrar la pestaña o cambiar de app), y va con `keepalive`
    // para que el navegador no aborte la petición al descargar la página.
    const alOcultarse = () => {
      if (document.visibilityState === 'hidden') enviarLatido(true);
    };

    video.addEventListener('pause', alPausar);
    video.addEventListener('ended', alTerminar);
    document.addEventListener('visibilitychange', alOcultarse);
    window.addEventListener('pagehide', alOcultarse);

    const intervalo = window.setInterval(() => {
      if (!video.paused) enviarLatido();
    }, INTERVALO_LATIDO_MS);

    return () => {
      video.removeEventListener('pause', alPausar);
      video.removeEventListener('ended', alTerminar);
      document.removeEventListener('visibilitychange', alOcultarse);
      window.removeEventListener('pagehide', alOcultarse);
      window.clearInterval(intervalo);
      enviarLatido(true); // último latido al desmontar (navegación interna)
    };
  }, [src, conPerfil, enviarLatido]);

  // --- Encadenado con el episodio siguiente ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !siguiente) return;
    const alTerminar = () => setCuentaAtras(SEGUNDOS_CUENTA_ATRAS);
    video.addEventListener('ended', alTerminar);
    return () => video.removeEventListener('ended', alTerminar);
  }, [siguiente]);

  useEffect(() => {
    if (cuentaAtras === null || !siguiente) return;
    if (cuentaAtras <= 0) {
      router.push(siguiente.href);
      return;
    }
    const t = window.setTimeout(() => setCuentaAtras((n) => (n ?? 1) - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cuentaAtras, siguiente, router]);

  // --- Atajos de teclado ---
  useEffect(() => {
    if (!src) return;
    const alPulsar = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      // No secuestrar el teclado mientras se escribe en un campo.
      const activo = document.activeElement;
      if (
        activo instanceof HTMLInputElement ||
        activo instanceof HTMLTextAreaElement ||
        (activo instanceof HTMLElement && activo.isContentEditable)
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (video.paused) void video.play().catch(() => undefined);
          else video.pause();
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - SALTO_SEG);
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + SALTO_SEG);
          break;
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        case 'm':
          e.preventDefault();
          video.muted = !video.muted;
          break;
        case 'f':
          e.preventDefault();
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
          else void contenedorRef.current?.requestFullscreen().catch(() => undefined);
          break;
      }
    };

    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [src]);

  function cambiarNivel(indice: number) {
    setNivel(indice);
    if (hlsRef.current) hlsRef.current.currentLevel = indice;
  }

  function empezarDeNuevo() {
    const video = videoRef.current;
    if (video) video.currentTime = 0;
    posicionInicial.current = 0;
    setReanudadoEn(null);
  }

  if (!src) {
    return (
      <div className="player-vacio">
        <h2 className="estado-glitch">Aún no disponible</h2>
        <p className="estado-txt">Este título todavía no se puede reproducir.</p>
      </div>
    );
  }

  return (
    <div
      className="player-marco"
      ref={(el) => {
        contenedorRef.current = el;
        setContenedorEl(el);
      }}
    >
      {ambiental && <HaloAmbiental video={videoEl} />}

      <video
        ref={(el) => {
          videoRef.current = el;
          setVideoEl(el);
        }}
        className="player-video"
        playsInline
        poster={poster ?? undefined}
      />

      <Controles
        video={videoEl}
        niveles={niveles}
        nivel={nivel}
        nivelReal={nivelReal}
        alCambiarNivel={cambiarNivel}
        contenedor={contenedorEl}
        siguienteHref={siguiente?.href}
        ambiental={ambiental}
        alCambiarAmbiental={setAmbiental}
      />

      {error && <div className="player-error">{error}</div>}

      {reanudadoEn !== null && (
        <div className="player-aviso player-reanudado">
          <span>▶ Reanudado en {formatear(reanudadoEn)}</span>
          <button type="button" className="player-btn" onClick={empezarDeNuevo}>
            Empezar de nuevo
          </button>
          <button
            type="button"
            className="player-cerrar"
            aria-label="Descartar aviso"
            onClick={() => setReanudadoEn(null)}
          >
            ✕
          </button>
        </div>
      )}

      {cuentaAtras !== null && siguiente && (
        <div className="player-siguiente">
          <span className="player-siguiente-txt">
            A continuación · {siguiente.etiqueta}
          </span>
          <div className="player-siguiente-acciones">
            <button
              type="button"
              className="btn btn-play"
              onClick={() => router.push(siguiente.href)}
            >
              Ver ahora ({cuentaAtras})
            </button>
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => setCuentaAtras(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!conPerfil && (
        <div className="player-aviso">
          Entra y elige un perfil para guardar tu progreso.
        </div>
      )}
    </div>
  );
}
