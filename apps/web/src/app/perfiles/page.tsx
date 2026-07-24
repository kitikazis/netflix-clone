'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  crearPerfil,
  eliminarPerfil,
  listarPerfiles,
  seleccionarPerfil,
  useSesion,
} from '@/lib/sesion';
import type { Perfil } from '@/lib/tipos';

export default function Perfiles() {
  const sesion = useSesion();
  const router = useRouter();
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [nombre, setNombre] = useState('');
  const [esInfantil, setEsInfantil] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [cargado, setCargado] = useState(false);

  // Se releen del servidor: la sesión local puede venir de otra pestaña o de
  // antes de que se creara/borrara un perfil.
  useEffect(() => {
    if (!sesion) return;
    let vivo = true;
    listarPerfiles()
      .then((res) => vivo && setPerfiles(res))
      .catch(() => vivo && setPerfiles(sesion.perfiles))
      .finally(() => vivo && setCargado(true));
    return () => {
      vivo = false;
    };
    // Solo al montar: las mutaciones de abajo ya actualizan el estado local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function crear(e: FormEvent) {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) return;
    setError(null);
    setOcupado(true);
    try {
      const perfil = await crearPerfil({ nombre: limpio, esInfantil });
      setPerfiles((ps) => [...ps, perfil]);
      setNombre('');
      setEsInfantil(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el perfil');
    } finally {
      setOcupado(false);
    }
  }

  async function borrar(perfil: Perfil) {
    setError(null);
    setOcupado(true);
    try {
      await eliminarPerfil(perfil.id);
      setPerfiles((ps) => ps.filter((p) => p.id !== perfil.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar el perfil');
    } finally {
      setOcupado(false);
    }
  }

  async function usar(perfil: Perfil) {
    setError(null);
    setOcupado(true);
    try {
      await seleccionarPerfil(perfil.id);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo elegir el perfil');
      setOcupado(false);
    }
  }

  if (!sesion) {
    return (
      <div className="entrar">
        <div className="panel">
          <div className="panel-cab">SIN SESIÓN</div>
          <p className="panel-txt">Entra para gestionar los perfiles de la cuenta.</p>
          <Link href="/entrar" className="btn btn-play">
            ▶ ENTRAR
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="entrar">
      <div className="panel panel-ancho">
        <div className="panel-cab">PERFILES</div>
        <p className="panel-txt">{sesion.correo}</p>

        <div className="perfiles">
          {!cargado && <span className="panel-txt">Leyendo cinta…</span>}
          {cargado && perfiles.length === 0 && (
            <span className="panel-txt">No hay perfiles todavía.</span>
          )}
          {perfiles.map((p) => {
            const activo = sesion.perfilActivo?.id === p.id;
            return (
              <div key={p.id} className={`perfil-card perfil-gestion ${activo ? 'activo' : ''}`}>
                <AvatarPerfil url={p.avatarUrl} nombre={p.nombre} />
                <span className="perfil-nombre">{p.nombre}</span>
                {p.esInfantil && <span className="perfil-kids">KIDS</span>}
                {activo && <span className="perfil-activo-eti">EN USO</span>}
                <div className="perfil-acciones">
                  <button
                    type="button"
                    className="barra-btn"
                    disabled={ocupado || activo}
                    onClick={() => void usar(p)}
                  >
                    USAR
                  </button>
                  <button
                    type="button"
                    className="barra-btn peligro"
                    disabled={ocupado || perfiles.length <= 1}
                    title={
                      perfiles.length <= 1
                        ? 'La cuenta necesita al menos un perfil'
                        : 'Borrar perfil'
                    }
                    onClick={() => void borrar(p)}
                  >
                    BORRAR
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <form className="perfil-alta" onSubmit={crear}>
          <label className="campo">
            <span>NUEVO PERFIL</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={100}
              placeholder="Nombre"
            />
          </label>
          <label className="campo-check">
            <input
              type="checkbox"
              checked={esInfantil}
              onChange={(e) => setEsInfantil(e.target.checked)}
            />
            <span>PERFIL INFANTIL</span>
          </label>
          <button
            type="submit"
            className="btn btn-play"
            disabled={ocupado || !nombre.trim()}
          >
            ＋ CREAR PERFIL
          </button>
        </form>

        {error && <div className="form-error">{error}</div>}

        <Link href="/" className="link-modo">
          ◀◀ Volver al catálogo
        </Link>
      </div>
    </div>
  );
}

/**
 * Avatar del perfil: la foto si la hay, y si no el disco de siempre.
 *
 * Va con `<img>` normal y no con el componente de Next porque las fotos de
 * Google viven en dominios que cambian y habría que autorizarlos uno a uno; por
 * una miniatura no compensa. Si la imagen falla —Google a veces las retira— se
 * cae al disco en vez de dejar el hueco roto.
 */
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
