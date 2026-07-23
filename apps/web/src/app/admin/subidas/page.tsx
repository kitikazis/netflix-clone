'use client';

import { Shell } from '@/components/admin/Shell';
import { PanelSubidas } from '@/components/admin/tablas';

export default function SubidasAdmin() {
  return (
    <Shell
      titulo="Subidas"
      descripcion="Cada vídeo subido, quién lo subió y a qué título se asignó"
    >
      <PanelSubidas />
    </Shell>
  );
}
