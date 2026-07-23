'use client';

import { Shell } from '@/components/admin/Shell';
import { PanelPerfiles } from '@/components/admin/tablas';

export default function PerfilesAdmin() {
  return (
    <Shell titulo="Perfiles" descripcion="Perfiles de cada cuenta">
      <PanelPerfiles />
    </Shell>
  );
}
