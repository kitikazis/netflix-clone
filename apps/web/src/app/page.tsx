import { API_BASE_URL } from '@/lib/api';

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
      data?: {
        status?: string;
        info?: Record<string, { status?: string }>;
      };
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

function Pill({ estado }: { estado?: string }) {
  const ok = estado === 'up' || estado === 'ok';
  return (
    <span className={`pill ${ok ? 'ok' : 'fail'}`}>
      <span className="punto" />
      {estado ?? 'sin datos'}
    </span>
  );
}

export default async function Home() {
  const salud = await obtenerSalud();

  return (
    <main className="contenedor">
      <div style={{ textAlign: 'center' }}>
        <div className="marca">NETFLIX</div>
        <p className="subtitulo">clon — proyecto de práctica</p>
      </div>

      <section className="panel">
        <h2>Estado del sistema</h2>

        {salud.disponible ? (
          <>
            <div className="fila">
              <span>API</span>
              <Pill estado={salud.general} />
            </div>
            <div className="fila">
              <span>PostgreSQL</span>
              <Pill estado={salud.database} />
            </div>
            <div className="fila">
              <span>Redis</span>
              <Pill estado={salud.redis} />
            </div>
          </>
        ) : (
          <p className="aviso">
            No se pudo contactar la API en <code>{API_BASE_URL}</code>.
            <br />
            Levanta el backend con <code>npm run dev:api</code>.
          </p>
        )}
      </section>

      <p className="fase">Fase 2 completada · catálogo (Fase 4) y reproductor (Fase 7) en camino</p>
    </main>
  );
}
