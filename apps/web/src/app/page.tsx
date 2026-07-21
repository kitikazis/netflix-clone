import { API_BASE_URL } from '@/lib/api';
import { Timecode } from '@/components/Timecode';

// Render dinámico: el fetch de salud ocurre en cada request (no en build).
export const dynamic = 'force-dynamic';

interface EstadoSalud {
  disponible: boolean;
  general?: string;
  database?: string;
  redis?: string;
}

async function obtenerSalud(): Promise<EstadoSalud> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
    const json = (await res.json()) as {
      data?: { status?: string; info?: Record<string, { status?: string }> };
    };
    const info = json.data?.info ?? {};
    return {
      disponible: true,
      general: json.data?.status,
      database: info.database?.status,
      redis: info.redis?.status,
    };
  } catch {
    return { disponible: false };
  }
}

function esOk(estado?: string): boolean {
  return estado === 'up' || estado === 'ok';
}

function Pista({ id, nombre, estado }: { id: string; nombre: string; estado?: string }) {
  const ok = esOk(estado);
  return (
    <div className="pista">
      <span className="id">{id}</span>
      <span className="nombre">{nombre}</span>
      <span className={`estado ${ok ? 'lock' : 'lost'}`}>
        <span className="barras" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
        {ok ? 'LOCK' : 'SIN SEÑAL'}
      </span>
    </div>
  );
}

export default async function Home() {
  const salud = await obtenerSalud();
  const fecha = new Date()
    .toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()
    .replace('.', '');

  return (
    <>
      {/* Capas de pantalla CRT */}
      <div className="overlay grain" aria-hidden />
      <div className="overlay scanlines" aria-hidden />
      <div className="overlay vignette" aria-hidden />
      <div className="overlay flicker" aria-hidden />
      <div className="tracking" aria-hidden />

      <main className="pantalla">
        {/* OSD superior */}
        <header className="osd">
          <div className="play">
            <span className="osd-txt">▶ PLAY</span>
            <span className="cinta">SP · CH&nbsp;03</span>
          </div>
          <div className="osd-right">
            <span className="rec">
              <span className="dot" aria-hidden /> REC&nbsp;<Timecode />
            </span>
            <span className="cinta">{fecha}</span>
          </div>
        </header>

        {/* Héroe */}
        <section className="heroe">
          <div className="canal">VIDEOCLUB · DIGITAL</div>
          <h1 className="wordmark">Netflix</h1>
          <p className="subtitulo">
            un <b>clon</b> de práctica
          </p>
        </section>

        {/* Panel de señal (estado del sistema) */}
        <section className="senal">
          <div className="senal-cab">
            <span>SEÑAL / TRACKING</span>
            <span>{salud.disponible ? 'RECEPCIÓN OK' : 'SIN PORTADORA'}</span>
          </div>

          {salud.disponible ? (
            <>
              <Pista id="TRK-01" nombre="API" estado={salud.general} />
              <Pista id="TRK-02" nombre="PostgreSQL" estado={salud.database} />
              <Pista id="TRK-03" nombre="Redis" estado={salud.redis} />
            </>
          ) : (
            <div className="sin-senal">
              ░▒▓ SIN PORTADORA ▓▒░
              <br />
              No hay respuesta de <code>{API_BASE_URL}</code>
              <br />
              Enciende el backend: <code>npm run dev:api</code>
            </div>
          )}
        </section>

        {/* Barra inferior: capítulos de la cinta */}
        <footer className="pie">
          <div className="pie-fila">
            <span>FASE 02 / 08 — MODELO DE DATOS</span>
            <span className="transporte">◀◀ &nbsp; ▶ &nbsp; ▶▶</span>
          </div>
          <div className="cinta-barra" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className={i < 2 ? 'ok' : i === 2 ? 'now' : ''} />
            ))}
          </div>
          <div className="pie-fila">
            <span>REBOBINA PARA VOLVER · AVANCE RÁPIDO PARA CONTINUAR</span>
            <span>{API_BASE_URL.replace(/^https?:\/\//, '')}</span>
          </div>
        </footer>
      </main>
    </>
  );
}
