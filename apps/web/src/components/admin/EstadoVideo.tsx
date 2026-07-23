'use client';

import { useState } from 'react';
import { reintentar } from '@/lib/subidas';

interface Props {
  tipo: 'contenido' | 'episodio';
  id: string;
  estado: string;
  /** Porcentaje del trabajo en curso; `undefined` si no hay ninguno vivo. */
  progreso?: number;
  tieneVideo?: boolean;
  alReintentar?: () => void;
}

/**
 * Estado del vídeo de una fila.
 *
 * Con «PROCESANDO» a secas no se sabía si quedaban diez segundos o diez
 * minutos. Cuando hay un trabajo vivo se dibuja su porcentaje.
 *
 * Y cuando la fila dice que está procesando pero en la cola no hay nada, es que
 * el trabajo murió: se reinició el servicio, se acabó la memoria, el hosting
 * gratuito durmió el contenedor. Eso se quedaba en «PROCESANDO» para siempre,
 * indistinguible de algo que va a terminar en un minuto. Ahora se dice y se
 * ofrece reintentar, que no hace falta volver a subir el archivo.
 */
export function EstadoVideo({
  tipo,
  id,
  estado,
  progreso,
  tieneVideo,
  alReintentar,
}: Props) {
  const [reintentando, setReintentando] = useState(false);
  const [error, setError] = useState(false);

  const enCurso = progreso !== undefined;
  const deberiaEstarEnCola = estado === 'EN_COLA' || estado === 'PROCESANDO';
  const interrumpido = deberiaEstarEnCola && !enCurso;

  async function reintentarAhora() {
    setReintentando(true);
    setError(false);
    try {
      await reintentar(tipo, id);
      alReintentar?.();
    } catch {
      setError(true);
    } finally {
      setReintentando(false);
    }
  }

  if (enCurso) {
    // Cero es «encolado pero nadie lo ha cogido aún», normalmente porque el
    // worker está con otro. Decirlo evita leer la barra vacía como atascada.
    const arrancado = progreso > 0;
    return (
      <div className="ev" title={arrancado ? `${progreso} % convertido` : 'Esperando turno'}>
        <div className="ev-barra">
          <span style={{ width: `${Math.max(progreso, 2)}%` }} />
        </div>
        <span className="ev-pct">{arrancado ? `${progreso} %` : 'En cola'}</span>
      </div>
    );
  }

  if (interrumpido || estado === 'ERROR') {
    return (
      <div className="ev-parado">
        <span className="pa-estado error">
          {estado === 'ERROR' ? 'Falló' : 'Interrumpido'}
        </span>
        <button
          type="button"
          className="pa-btn"
          disabled={reintentando}
          onClick={() => void reintentarAhora()}
        >
          {reintentando ? '…' : error ? 'No se pudo' : 'Reintentar'}
        </button>
      </div>
    );
  }

  if (estado === 'PENDIENTE' && !tieneVideo) {
    return <span className="pa-estado">Sin vídeo</span>;
  }

  const etiquetas: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    LISTO: 'Listo',
  };
  return (
    <span className={`pa-estado ${estado.toLowerCase()}`}>{etiquetas[estado] ?? estado}</span>
  );
}
