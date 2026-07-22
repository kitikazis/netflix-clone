/**
 * Genera un slug URL-friendly: sin acentos, minúsculas, guiones.
 * Ej: "Los Increíbles 2" -> "los-increibles-2".
 */
export function generarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos combinados
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Genera un slug único: parte de `base` y, si `existe` lo reporta como tomado,
 * añade sufijos incrementales (`-2`, `-3`, ...). `existe` encapsula la consulta
 * al repositorio (incluyendo la exclusión del propio registro al actualizar).
 */
export async function generarSlugUnico(
  base: string,
  existe: (slug: string) => Promise<boolean>,
): Promise<string> {
  const raiz = generarSlug(base) || 'item';
  let candidato = raiz;
  let n = 2;
  while (await existe(candidato)) {
    candidato = `${raiz}-${n}`.slice(0, 80);
    n += 1;
  }
  return candidato;
}
