'use client';

import { Shell } from '@/components/admin/Shell';
import { PanelEpisodios } from '@/components/admin/tablas';

export default function EpisodiosAdmin() {
  return (
    <Shell
      titulo="Episodios"
      descripcion="Todos los episodios del catálogo. Para editarlos, entra por su serie en Catálogo."
    >
      <PanelEpisodios />
    </Shell>
  );
}
