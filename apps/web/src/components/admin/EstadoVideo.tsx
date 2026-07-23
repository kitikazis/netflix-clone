'use client';

interface Props {
  estado: string;
  /** Porcentaje del trabajo en curso, si lo hay. */
  progreso?: number;
  /** Un título sin vídeo nunca llega a LISTO: conviene distinguirlo. */
  tieneVideo?: boolean;
}

/**
 * Estado del vídeo de una fila.
 *
 * Con «PROCESANDO» a secas no se sabía si quedaban diez segundos o diez
 * minutos, y la única salida era mirar la pantalla a ver si cambiaba. Cuando
 * hay un trabajo en marcha se dibuja una barra con su porcentaje, y así se ve
 * avanzar.
 */
export function EstadoVideo({ estado, progreso, tieneVideo }: Props) {
  const enCurso = progreso !== undefined;

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

  if (estado === 'PENDIENTE' && !tieneVideo) {
    return <span className="pa-estado">Sin vídeo</span>;
  }

  const etiquetas: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    PROCESANDO: 'Procesando…',
    LISTO: 'Listo',
    ERROR: 'Error',
  };
  return (
    <span className={`pa-estado ${estado.toLowerCase()}`}>{etiquetas[estado] ?? estado}</span>
  );
}
