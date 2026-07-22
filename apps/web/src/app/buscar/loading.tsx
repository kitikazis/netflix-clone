import { EsqueletoRejilla } from '@/components/Esqueleto';

export default function CargandoBusqueda() {
  return (
    <div className="catalogo">
      <section className="fila">
        <div className="fila-cab">
          <span>⌕ BUSCANDO…</span>
        </div>
        <EsqueletoRejilla />
      </section>
    </div>
  );
}
