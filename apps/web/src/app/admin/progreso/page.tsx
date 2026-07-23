'use client';

import { Shell } from '@/components/admin/Shell';
import { PanelProgreso } from '@/components/admin/tablas';

export default function ProgresoAdmin() {
  return (
    <Shell titulo="Progreso" descripcion="Posiciones de reproducción guardadas">
      <PanelProgreso />
    </Shell>
  );
}
