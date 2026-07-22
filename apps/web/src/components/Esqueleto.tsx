/** Rejilla de carátulas fantasma, para los estados de carga. */
export function EsqueletoRejilla({ cantidad = 12 }: { cantidad?: number }) {
  return (
    <div className="rejilla" aria-hidden>
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="vhs-esqueleto" />
      ))}
    </div>
  );
}

/** Cabecera + rejilla fantasma con el rótulo de "sintonizando". */
export function EsqueletoCatalogo({ rotulo = 'SINTONIZANDO…' }: { rotulo?: string }) {
  return (
    <div className="catalogo">
      <section className="hero hero-esqueleto">
        <div className="hero-cuerpo">
          <div className="canal">{rotulo}</div>
        </div>
      </section>
      <section className="fila">
        <div className="fila-cab">
          <span>▦ CATÁLOGO</span>
        </div>
        <EsqueletoRejilla />
      </section>
    </div>
  );
}
