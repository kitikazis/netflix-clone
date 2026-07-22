import { expect, test, type Page } from '@playwright/test';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

/**
 * Busca en el catálogo un título con vídeo listo.
 *
 * No se fija un slug a mano porque el contenido reproducible del portafolio
 * cambia según lo que se haya subido; una prueba clavada a un slug concreto se
 * rompe por el motivo equivocado.
 */
async function slugReproducible(page: Page): Promise<string> {
  const res = await page.request.get(`${API}/catalogo/contenido?limite=100`);
  expect(res.ok(), `el catálogo no responde en ${API}`).toBeTruthy();
  const cuerpo = await res.json();
  const items = cuerpo.data?.items ?? cuerpo.data ?? [];
  const listo = items.find(
    (c: { hlsPlaylistUrl?: string | null }) => !!c.hlsPlaylistUrl,
  );
  test.skip(!listo, 'no hay ningún título transcodificado en este entorno');
  return listo.slug;
}

/** Despierta los controles: se esconden solos a los 2,8 s. */
async function abrirAjustes(page: Page) {
  await page.locator('.player-marco').hover();
  await page.getByRole('button', { name: 'Ajustes' }).click();
}

test.describe('reproductor', () => {
  test('carga el HLS y el tiempo avanza al reproducir', async ({ page }) => {
    await page.goto(`/ver/${await slugReproducible(page)}`);

    const video = page.locator('video');
    await expect(video).toBeVisible();

    // Que el elemento exista no dice nada: hay que ver que le llegan datos.
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState), {
        timeout: 60_000,
      })
      .toBeGreaterThanOrEqual(2);

    await video.evaluate((v: HTMLVideoElement) => v.play());
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), {
        timeout: 20_000,
      })
      .toBeGreaterThan(0);
  });

  /**
   * Esta es la prueba que faltaba.
   *
   * La calidad se quedó en gris en producción porque se prefería la
   * reproducción nativa del navegador antes que hls.js, y por ese camino las
   * variantes del manifiesto no se exponen. El vídeo se veía igual, así que
   * nada lo delataba: solo abrir el menú en un navegador de verdad lo saca.
   */
  test('el menú ofrece las calidades del manifiesto', async ({ page }) => {
    await page.goto(`/ver/${await slugReproducible(page)}`);
    await expect(page.locator('video')).toBeVisible();

    await abrirAjustes(page);
    const calidad = page.getByRole('menuitem', { name: /Calidad/ });
    await expect(calidad).toBeVisible();
    // Se desactiva sola cuando no hay niveles: exactamente el síntoma del fallo.
    await expect(calidad).toBeEnabled();

    await calidad.click();
    const opciones = page.getByRole('menuitemradio');
    // Automática, más al menos dos variantes reales.
    await expect
      .poll(() => opciones.count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(3);
    await expect(page.getByRole('menuitemradio', { name: /Automática/ })).toBeVisible();
    await expect(page.getByText('máxima')).toBeVisible();
  });

  test('fijar una calidad concreta la saca del modo automático', async ({ page }) => {
    await page.goto(`/ver/${await slugReproducible(page)}`);
    await abrirAjustes(page);
    await page.getByRole('menuitem', { name: /Calidad/ }).click();

    const opciones = page.getByRole('menuitemradio');
    await expect
      .poll(() => opciones.count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(3);

    // La última de la lista es la más baja; sirve igual para ver que queda fijada.
    await opciones.last().click();
    await abrirAjustes(page);
    await expect(page.getByRole('menuitem', { name: /Calidad/ })).not.toContainText(
      'Automática',
    );
  });

  test('la velocidad se aplica al vídeo, no solo a la etiqueta', async ({ page }) => {
    await page.goto(`/ver/${await slugReproducible(page)}`);
    await abrirAjustes(page);
    await page.getByRole('menuitem', { name: /Velocidad/ }).click();
    await page.getByRole('menuitemradio', { name: '2×' }).click();

    await expect
      .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.playbackRate))
      .toBe(2);
  });

  test('sin pistas, los subtítulos quedan desactivados en vez de abrir un menú vacío', async ({
    page,
  }) => {
    await page.goto(`/ver/${await slugReproducible(page)}`);
    await abrirAjustes(page);
    await expect(page.getByRole('menuitem', { name: /Subtítulos/ })).toBeDisabled();
  });
});

test.describe('catálogo', () => {
  test('la portada lista títulos con sus carátulas', async ({ page }) => {
    await page.goto('/');
    await expect
      .poll(() => page.locator('.vhs-titulo').count(), { timeout: 60_000 })
      .toBeGreaterThan(5);
    // Las carátulas pasan por el optimizador de imágenes de Next.
    await expect(page.locator('img[src*="_next/image"]').first()).toBeVisible();
  });

  test('el buscador sugiere mientras se escribe', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Buscar en el catálogo').fill('batman');
    const sugerencias = page.getByRole('option');
    await expect.poll(() => sugerencias.count(), { timeout: 30_000 }).toBeGreaterThan(0);
    // Se busca solo por título: nada de coincidencias escondidas en la sinopsis.
    await expect(sugerencias.first()).toContainText(/batman/i);
  });

  test('un título inexistente devuelve un 404 de verdad', async ({ page }) => {
    // Llegó a devolver 200 con la página de error dentro: el `loading.tsx` de
    // raíz fijaba el estado antes de saber si el título existía.
    const res = await page.goto('/titulo/no-existe-este-titulo');
    expect(res?.status()).toBe(404);
  });
});
