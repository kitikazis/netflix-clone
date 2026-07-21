'use client';

import { useEffect, useState } from 'react';

function formatear(totalSeg: number): string {
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = Math.floor(totalSeg % 60);
  return [h, m, s].map((n) => n.toString().padStart(2, '0')).join(':');
}

/**
 * Timecode estilo VHS que corre. Arranca en 00:00:00 tanto en servidor como en
 * cliente (render determinista → sin hydration mismatch) y empieza a contar tras montar.
 */
export function Timecode() {
  const [seg, setSeg] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeg((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return <span suppressHydrationWarning>{formatear(seg)}</span>;
}
