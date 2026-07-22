'use client';

import { FormEvent, useState } from 'react';
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

  async function elegir(perfilId: string) {
    setError(null);
    setCargando(true);
    try {
      await seleccionarPerfil(perfilId);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al elegir perfil');
      setCargando(false);
    }
  }

  // Paso 2: sesión iniciada, elegir perfil.
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
                <span className="perfil-avatar">◉</span>
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
