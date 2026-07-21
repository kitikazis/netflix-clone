/**
 * Convierte una duración tipo '15m' / '7d' / '3600' a segundos.
 * Sufijos: s (segundos), m (minutos), h (horas), d (días).
 */
export function duracionASegundos(valor: string): number {
  const limpio = valor.trim();
  const match = /^(\d+)\s*([smhd])$/.exec(limpio);
  if (!match) {
    const n = Number(limpio);
    if (!Number.isNaN(n)) return n;
    throw new Error(`Duración inválida: "${valor}"`);
  }
  const cantidad = parseInt(match[1], 10);
  const factor: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return cantidad * factor[match[2]];
}
