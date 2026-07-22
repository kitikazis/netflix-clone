import { generarSlug, generarSlugUnico } from './slug';

describe('generarSlug', () => {
  it('quita acentos, pasa a minúsculas y separa con guiones', () => {
    expect(generarSlug('Los Increíbles 2')).toBe('los-increibles-2');
  });

  it('colapsa símbolos y recorta guiones sobrantes', () => {
    expect(generarSlug('  ¡Hola,  Mundo!  ')).toBe('hola-mundo');
  });

  it('trunca a 80 caracteres', () => {
    expect(generarSlug('a'.repeat(120))).toHaveLength(80);
  });
});

describe('generarSlugUnico', () => {
  it('devuelve la raíz cuando está libre', async () => {
    const slug = await generarSlugUnico('Acción', () => Promise.resolve(false));
    expect(slug).toBe('accion');
  });

  it('añade sufijos incrementales hasta encontrar uno libre', async () => {
    const tomados = new Set(['accion', 'accion-2']);
    const slug = await generarSlugUnico('Acción', (s) => Promise.resolve(tomados.has(s)));
    expect(slug).toBe('accion-3');
  });

  it('cae a "item" si el texto no produce caracteres válidos', async () => {
    const slug = await generarSlugUnico('¡!¿?', () => Promise.resolve(false));
    expect(slug).toBe('item');
  });
});
