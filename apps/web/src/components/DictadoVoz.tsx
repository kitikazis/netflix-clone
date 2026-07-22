'use client';

import { useEffect, useRef, useState } from 'react';

/** Lo poco que se usa de la API de reconocimiento de voz, tipado a mano. */
interface Reconocimiento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: EventoReconocimiento) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
interface EventoReconocimiento {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
type ConstructorReconocimiento = new () => Reconocimiento;

declare global {
  interface Window {
    SpeechRecognition?: ConstructorReconocimiento;
    webkitSpeechRecognition?: ConstructorReconocimiento;
  }
}

interface Props {
  alDictar: (texto: string) => void;
}

/**
 * Dictado por voz para el buscador.
 *
 * Usa la API de reconocimiento del navegador: no hay servidor de por medio ni
 * coste alguno. A cambio, **solo existe en Chrome, Edge y Safari**; en Firefox
 * no está implementada. Por eso el botón no se pinta si no hay soporte, en
 * lugar de mostrarse y fallar al pulsarlo.
 *
 * El soporte se comprueba tras montar y no durante el render: en el servidor
 * no existe `window`, y decidirlo allí provocaría un desajuste de hidratación.
 */
export function DictadoVoz({ alDictar }: Props) {
  const [soportado, setSoportado] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const reconocimiento = useRef<Reconocimiento | null>(null);

  useEffect(() => {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor) return;
    setSoportado(true);

    const r = new Constructor();
    r.lang = 'es-ES';
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) => {
      const texto = e.results[0]?.[0]?.transcript?.trim();
      if (texto) alDictar(texto);
    };
    r.onerror = () => setEscuchando(false);
    r.onend = () => setEscuchando(false);
    reconocimiento.current = r;

    return () => {
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      try {
        r.stop();
      } catch {
        // Ya estaba parado.
      }
    };
  }, [alDictar]);

  if (!soportado) return null;

  function alternar() {
    const r = reconocimiento.current;
    if (!r) return;
    if (escuchando) {
      r.stop();
      setEscuchando(false);
      return;
    }
    try {
      r.start();
      setEscuchando(true);
    } catch {
      // Llamar a start() dos veces seguidas lanza; se ignora.
    }
  }

  return (
    <button
      type="button"
      className={`voz ${escuchando ? 'escuchando' : ''}`}
      onClick={alternar}
      aria-label={escuchando ? 'Detener el dictado' : 'Buscar por voz'}
      title={escuchando ? 'Detener' : 'Buscar por voz'}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden focusable="false">
        <path
          fill="currentColor"
          d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11z"
        />
      </svg>
    </button>
  );
}
