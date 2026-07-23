'use client';

import { Shell } from '@/components/admin/Shell';
import { PanelResumen } from '@/components/admin/PanelResumen';

export default function ResumenAdmin() {
  return (
    <Shell titulo="Resumen" descripcion="Estado de la base de datos de un vistazo">
      <PanelResumen />
    </Shell>
  );
}
