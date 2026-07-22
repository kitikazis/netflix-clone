'use client';

import { useEffect, useRef, useState } from 'react';
import { iniciarSesionConGoogle } from '@/lib/sesion';
import { IconoGoogle } from './iconos';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const SCRIPT = 'https://accounts.google.com/gsi/client';

/** Lo poco que se usa de la librería de Google, tipado a mano. */
interface GoogleGSI {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (respuesta: { credential?: string }) => void;
      }) => void;
      renderButton: (
        contenedor: HTMLElement,
        opciones: Record<string, string | number>,
      ) => void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleGSI;
  }
}

function cargarScript(): Promise<void> {
  if (document.querySelector(`script[src="${SCRIPT}"]`)) return Promise.resolve();
  return new Promise((resolver, rechazar) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolver();
    s.onerror = () => rechazar(new Error('No se pudo cargar Google'));
    document.head.appendChild(s);
  });
}

interface Props {
  alEntrar: () => void;
}

/**
 * Botón de Google Identity Services.
 *
 * Google entrega un ID token en el navegador y la API lo canjea por los tokens
 * propios tras verificar su firma. Si no hay `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
 * configurado, se muestra desactivado en lugar de fallar al pulsarlo: es
 * preferible un botón que se explica a uno que no hace nada.
 */
export function BotonGoogle({ alEntrar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID || !contenedor.current) return;
    let vivo = true;

    cargarScript()
      .then(() => {
        if (!vivo || !window.google || !contenedor.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: ({ credential }) => {
            if (!credential) return;
            setEntrando(true);
            setError(null);
            iniciarSesionConGoogle(credential)
              .then(() => alEntrar())
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'No se pudo entrar con Google');
                setEntrando(false);
              });
          },
        });
        window.google.accounts.id.renderButton(contenedor.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          locale: 'es',
          width: 280,
        });
      })
      .catch(() => vivo && setError('No se pudo cargar Google'));

    return () => {
      vivo = false;
    };
  }, [alEntrar]);

  if (!CLIENT_ID) {
    return (
      <div className="acceso-alterno">
        <button type="button" className="btn btn-fantasma" disabled>
          <IconoGoogle />
          Continuar con Google
        </button>
        <p className="acceso-nota">
          Falta configurar <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="acceso-alterno">
      <div ref={contenedor} aria-busy={entrando} />
      {entrando && <p className="acceso-nota">Entrando…</p>}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
