'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_PUBLIC_URL } from '@/lib/urls';

/** Cada cuánto se vuelve a preguntar si la API ya responde. */
const INTERVALO_SONDEO_MS = 3000;
/** A partir de aquí se deja de esperar y se asume que está caída de verdad. */
const LIMITE_ESPERA_MS = 150_000;

interface Props {
  /** Qué se estaba intentando cargar, para el mensaje. */
  que?: string;
}

/**
 * Estado de "la API está arrancando".
 *
 * En hosting gratuito el servidor se duerme por inactividad y tarda cerca de un
 * minuto en volver. Eso NO es un fallo, pero antes se mostraba el mismo aviso
 * que una caída real, así que parecía roto y el usuario se iba.
 *
 * Aquí se distingue: mientras haya esperanza se muestra el contador y se sondea
 * `/health`; en cuanto responde se rehace el render del servidor y aparece el
 * contenido solo, sin que el usuario toque nada. Si pasa el límite sin
 * respuesta, entonces sí se avisa de que está caída.
 */
export function ApiDespertando({ que = 'el catálogo' }: Props) {
  const router = useRouter();
  const [segundos, setSegundos] = useState(0);
  const [caida, setCaida] = useState(false);

  useEffect(() => {
    let vivo = true;
    const inicio = Date.now();

    const reloj = window.setInterval(() => {
      if (vivo) setSegundos(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);

    async function sondear() {
      while (vivo) {
        try {
          const res = await fetch(`${API_PUBLIC_URL}/health`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(10_000),
          });
          if (!vivo) return;
          if (res.ok) {
            // Ya responde: se repite el render en servidor, que ahora sí
            // conseguirá los datos. No hace falta duplicar aquí la lógica de
            // carga del catálogo.
            router.refresh();
            return;
          }
        } catch {
          // Sigue dormida o sin red: se reintenta.
        }
        if (!vivo) return;
        if (Date.now() - inicio > LIMITE_ESPERA_MS) {
          setCaida(true);
          return;
        }
        await new Promise((r) => setTimeout(r, INTERVALO_SONDEO_MS));
      }
    }

    void sondear();
    return () => {
      vivo = false;
      window.clearInterval(reloj);
    };
  }, [router]);

  if (caida) {
    return (
      <div className="sin-senal">
        ░▒▓ SIN PORTADORA ▓▒░
        <br />
        El servidor no responde. Vuelve a intentarlo en un rato.
        <br />
        <button type="button" className="btn btn-fantasma" onClick={() => location.reload()}>
          ↻ REINTENTAR
        </button>
      </div>
    );
  }

  return (
    <div className="despertando" role="status" aria-live="polite">
      <div className="despertando-rotulo">▶ RE B O B I N A N D O</div>
      <p className="despertando-txt">
        Encendiendo el proyector… El servidor estaba en reposo y tarda cerca de un
        minuto en arrancar. {que.charAt(0).toUpperCase() + que.slice(1)} aparecerá
        solo, no recargues.
      </p>
      <div className="despertando-barra" aria-hidden>
        <span />
      </div>
      <div className="despertando-tiempo">{segundos}s</div>
    </div>
  );
}
