'use client';

import { Shell } from '@/components/admin/Shell';
import { PanelUsuarios } from '@/components/admin/PanelUsuarios';

export default function CuentasAdmin() {
  return (
    <Shell titulo="Cuentas" descripcion="Usuarios, rol y estado de acceso">
      <PanelUsuarios />
    </Shell>
  );
}
