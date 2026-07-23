'use client';

import { useRef, useState } from 'react';
import {
  TIPOS_ACEPTADOS,
  encolarContenido,
  encolarEpisodio,
  formatearBytes,
  subirVideo,
} from '@/lib/subidas';

type Destino = { tipo: 'contenido' | 'episodio'; id: string };

interface Props {
  destino: Destino;
  /** Lo que se está reemplazando, para que quede claro sobre qué se actúa. */
  nombre: string;
  estadoActual?: string;
  alTerminar?: () => void;
  alCerrar: () => void;
}

type Fase = 'elegir' | 'subiendo' | 'encolando' | 'hecho';

/**
 * Sube un vídeo y encola su transcodificación.
 *
 * Son dos pasos separados y conviene que se noten: la subida puede llevar
 * minutos y la transcodificación ocurre después, en el worker. Cuando esto
 * termina, el vídeo todavía no se puede ver; lo que hay es un trabajo en cola.
 * Decirlo evita la impresión de que algo ha fallado al volver a la tabla y
 * seguir viendo "PENDIENTE".
 */
export function SubirVideo({ destino, nombre, estadoActual, alTerminar, alCerrar }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fase, setFase] = useState<Fase>('elegir');
  const [porcentaje, setPorcentaje] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const aborto = useRef<AbortController | null>(null);

  async function enviar() {
    if (!archivo) return;
    setError(null);
    setFase('subiendo');
    setPorcentaje(0);
    aborto.current = new AbortController();

    try {
      const clave = await subirVideo(archivo, setPorcentaje, aborto.current.signal);
      setFase('encolando');
      if (destino.tipo === 'contenido') await encolarContenido(destino.id, clave);
      else await encolarEpisodio(destino.id, clave);
      setFase('hecho');
      alTerminar?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el vídeo');
      setFase('elegir');
    }
  }

  const trabajando = fase === 'subiendo' || fase === 'encolando';

  return (
    <div className="subida">
      <div className="subida-cab">
        <span className="subida-titulo">Vídeo de «{nombre}»</span>
        {estadoActual && <span className="admin-estado">{estadoActual}</span>}
      </div>

      {fase === 'hecho' ? (
        <>
          <p className="panel-txt">
            Subido y encolado. La transcodificación corre aparte: el estado pasará a
            <strong> PROCESANDO</strong> y luego a <strong>LISTO</strong> por su cuenta.
            Puede tardar varios minutos según la duración del vídeo.
          </p>
          <div className="admin-form-acciones">
            <button type="button" className="btn btn-play" onClick={alCerrar}>
              Cerrar
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="subida-caja">
            <input
              type="file"
              accept={TIPOS_ACEPTADOS}
              disabled={trabajando}
              onChange={(e) => {
                setArchivo(e.target.files?.[0] ?? null);
                setError(null);
              }}
            />
            <span>
              {archivo
                ? `${archivo.name} · ${formatearBytes(archivo.size)}`
                : 'Elegir archivo de vídeo (MP4, MKV, MOV o WebM)'}
            </span>
          </label>

          {/* El archivo va directo al almacenamiento, sin pasar por la API. */}
          {trabajando && (
            <div className="subida-progreso">
              <div className="subida-barra">
                <span style={{ width: `${fase === 'encolando' ? 100 : porcentaje}%` }} />
              </div>
              <span className="subida-pct">
                {fase === 'encolando' ? 'Encolando…' : `${porcentaje} %`}
              </span>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="admin-form-acciones">
            <button
              type="button"
              className="btn btn-play"
              disabled={!archivo || trabajando}
              onClick={() => void enviar()}
            >
              {fase === 'subiendo' ? 'Subiendo…' : 'Subir y transcodificar'}
            </button>
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => {
                if (trabajando) aborto.current?.abort();
                else alCerrar();
              }}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
