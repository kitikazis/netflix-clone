'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  iniciarSesion,
  registrar,
  seleccionarPerfil,
  useSesion,
} from '@/lib/sesion';
import { BotonGoogle } from '@/components/auth/BotonGoogle';
import { AccesoWhatsApp } from '@/components/auth/AccesoWhatsApp';
import { IconoWhatsApp } from '@/components/auth/iconos';

export default function Entrar() {
  const sesion = useSesion();
  const router = useRouter();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [via, setVia] = useState<'correo' | 'whatsapp'>('correo');

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      if (modo === 'login') await iniciarSesion(correo, contrasena);
      else await registrar(correo, contrasena);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al entrar');
    } finally {
      setCargando(false);
    }
  }

  const elegir = useCallback(
    async (perfilId: string) => {
      setError(null);
      setCargando(true);
      try {
        await seleccionarPerfil(perfilId);
        router.push('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al elegir perfil');
        setCargando(false);
      }
    },
    [router],
  );

  /**
   * Con un solo perfil no hay nada que elegir: se entra directo.
   *
   * La pantalla de «¿quién está viendo?» tiene sentido en un televisor que
   * comparte una familia; con un perfil por cuenta solo era un paso de más
   * entre poner la contraseña y ver algo. Se deja el selector para cuando haya
   * varios, que el modelo los sigue admitiendo.
   */
  const yaIntentado = useRef(false);
  useEffect(() => {
    if (!sesion || sesion.perfilActivo || sesion.perfiles.length !== 1) return;
    // Una sola vez. Si la selección falla —token caducado, red— el estado
    // vuelve a como estaba y el efecto se dispararía otra vez: sin este
    // pestillo son mil peticiones por minuto contra la API. Medido.
    if (yaIntentado.current) return;
    yaIntentado.current = true;
    void elegir(sesion.perfiles[0].id);
  }, [sesion, elegir]);

  // Paso 2: sesión iniciada, y hay más de un perfil: se elige.
  if (sesion && !sesion.perfilActivo) {
    return (
      <div className="entrar">
        <div className="panel">
          <div className="panel-cab">¿Quién está viendo?</div>
          <div className="perfiles">
            {sesion.perfiles.map((p) => (
              <button
                key={p.id}
                type="button"
                className="perfil-card"
                disabled={cargando}
                onClick={() => elegir(p.id)}
              >
                <AvatarPerfil url={p.avatarUrl} nombre={p.nombre} />
                <span className="perfil-nombre">{p.nombre}</span>
                {p.esInfantil && <span className="perfil-kids">Infantil</span>}
              </button>
            ))}
          </div>
          {error && <div className="form-error">{error}</div>}
          <Link href="/perfiles" className="link-modo">
            Gestionar perfiles
          </Link>
        </div>
      </div>
    );
  }

  // Ya con perfil activo.
  if (sesion?.perfilActivo) {
    return (
      <div className="entrar">
        <div className="panel">
          <div className="panel-cab">Sesión activa</div>
          <p className="panel-txt">
            Perfil <b>{sesion.perfilActivo.nombre}</b> · {sesion.correo}
          </p>
          <Link href="/" className="btn btn-play">
            Ir al catálogo
          </Link>
          <Link href="/perfiles" className="link-modo">
            Gestionar perfiles
          </Link>
        </div>
      </div>
    );
  }

  // Paso 1: login / registro.
  return (
    <div className="entrar">
      <form className="panel" onSubmit={enviar}>
        <div className="panel-cab">{modo === 'login' ? 'Entrar' : 'Crear cuenta'}</div>

        <label className="campo">
          <span>Correo</span>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="campo">
          <span>Contraseña</span>
          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
            minLength={8}
            autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn btn-play" disabled={cargando}>
          {cargando ? 'Un momento…' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>

        <button
          type="button"
          className="link-modo"
          onClick={() => {
            setModo(modo === 'login' ? 'registro' : 'login');
            setError(null);
          }}
        >
          {modo === 'login'
            ? '¿Sin cuenta? Crear una'
            : '¿Ya tienes cuenta? Entrar'}
        </button>
      </form>

      <div className="panel acceso-otros">
        <div className="acceso-separador">
          <span>o entra con</span>
        </div>

        <BotonGoogle alEntrar={() => setError(null)} />

        {via === 'whatsapp' ? (
          <AccesoWhatsApp alEntrar={() => setError(null)} />
        ) : (
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => setVia('whatsapp')}
          >
            <IconoWhatsApp />
            Continuar con WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}

/** Foto del perfil, con el disco de siempre como respaldo. */
function AvatarPerfil({ url, nombre }: { url: string | null; nombre: string }) {
  const [roto, setRoto] = useState(false);
  if (!url || roto) return <span className="perfil-avatar">◉</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="perfil-avatar perfil-foto"
      src={url}
      alt={`Foto de ${nombre}`}
      width={56}
      height={56}
      referrerPolicy="no-referrer"
      onError={() => setRoto(true)}
    />
  );
}
