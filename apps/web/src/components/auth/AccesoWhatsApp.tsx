'use client';

import { FormEvent, useEffect, useState } from 'react';
import { solicitarCodigoWhatsApp, verificarCodigoWhatsApp } from '@/lib/sesion';

const ACTIVO = process.env.NEXT_PUBLIC_AUTH_WHATSAPP === 'true';
/** Espera antes de poder pedir otro código, para no gastar el cupo de envíos. */
const ESPERA_REENVIO_S = 60;

interface Props {
  alEntrar: () => void;
}

/** Deja solo dígitos y el prefijo `+`, que es lo que espera la API. */
function normalizar(valor: string): string {
  const limpio = valor.replace(/[^\d+]/g, '');
  return limpio.startsWith('+') ? '+' + limpio.slice(1).replace(/\+/g, '') : limpio;
}

export function AccesoWhatsApp({ alEntrar }: Props) {
  const [paso, setPaso] = useState<'numero' | 'codigo'>('numero');
  const [telefono, setTelefono] = useState('+51');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(0);

  // Cuenta atrás del reenvío.
  useEffect(() => {
    if (espera <= 0) return;
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [espera]);

  if (!ACTIVO) {
    return (
      <div className="acceso-alterno">
        <button type="button" className="btn btn-fantasma" disabled>
          Continuar con WhatsApp
        </button>
        <p className="acceso-nota">Todavía no está disponible.</p>
      </div>
    );
  }

  async function pedirCodigo(e?: FormEvent) {
    e?.preventDefault();
    const numero = normalizar(telefono);
    if (numero.replace(/\D/g, '').length < 8) {
      setError('Escribe el número con su prefijo internacional');
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await solicitarCodigoWhatsApp(numero);
      setTelefono(numero);
      setPaso('codigo');
      setEspera(ESPERA_REENVIO_S);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el código');
    } finally {
      setOcupado(false);
    }
  }

  async function verificar(e: FormEvent) {
    e.preventDefault();
    if (codigo.length !== 6) return;
    setOcupado(true);
    setError(null);
    try {
      await verificarCodigoWhatsApp(telefono, codigo);
      alEntrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código incorrecto o caducado');
      setOcupado(false);
    }
  }

  if (paso === 'numero') {
    return (
      <form className="acceso-alterno" onSubmit={pedirCodigo}>
        <label className="campo">
          <span>Número de WhatsApp</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+51 999 999 999"
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="btn btn-fantasma" disabled={ocupado}>
          {ocupado ? 'Enviando…' : 'Enviarme un código'}
        </button>
      </form>
    );
  }

  return (
    <form className="acceso-alterno" onSubmit={verificar}>
      <p className="acceso-nota">
        Te enviamos un código de 6 dígitos a <b>{telefono}</b>.
      </p>
      <label className="campo">
        <span>Código</span>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="acceso-codigo"
          autoFocus
        />
      </label>
      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="btn btn-play" disabled={ocupado || codigo.length !== 6}>
        {ocupado ? 'Comprobando…' : 'Entrar'}
      </button>
      <div className="acceso-pie">
        <button
          type="button"
          className="link-modo"
          onClick={() => {
            setPaso('numero');
            setCodigo('');
            setError(null);
          }}
        >
          Cambiar el número
        </button>
        <button
          type="button"
          className="link-modo"
          disabled={espera > 0 || ocupado}
          onClick={() => void pedirCodigo()}
        >
          {espera > 0 ? `Reenviar en ${espera}s` : 'Reenviar código'}
        </button>
      </div>
    </form>
  );
}
