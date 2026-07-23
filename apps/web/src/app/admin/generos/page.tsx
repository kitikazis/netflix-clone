'use client';

import { Shell } from '@/components/admin/Shell';
import { PanelGeneros } from '@/components/admin/tablas';

export default function GenerosAdmin() {
  return (
    <Shell titulo="Géneros" descripcion="Etiquetas con las que se agrupa el catálogo">
      <PanelGeneros />
    </Shell>
  );
}
