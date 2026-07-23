import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo.
 *
 * Existen por un motivo concreto: el selector de calidad estuvo roto sin que
 * nadie lo notara. Las comprobaciones por HTTP daban verde —la página cargaba y
 * el vídeo se veía— porque ninguna llegaba a ejecutar hls.js en un navegador de
 * verdad, que es justo donde estaba el fallo.
 *
 * Por defecto levanta el front en local. La API tiene que estar ya en marcha
 * (`npm run start:dev -w @netflix-clone/api`), porque estas pruebas leen del
 * catálogo real en lugar de fingir respuestas: lo que se quiere comprobar aquí
 * es la integración, no otra vez los componentes por separado.
 *
 * Con BASE_URL se apunta a una previsualización o al sitio publicado.
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:3001';
const LOCAL = !process.env.BASE_URL;

export default defineConfig({
  testDir: './e2e',
  // Un vídeo tarda en arrancar, y la API en hosting gratuito duerme: márgenes anchos.
  timeout: 120_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
  },
  /**
   * Los tres motores, no tres marcas: Chromium cubre Chrome, Edge, Opera y
   * Brave; WebKit es Safari, y en iOS es el único que existe —hasta Chrome en
   * iPhone es WebKit por dentro—; Firefox va por libre con Gecko.
   *
   * WebKit importa especialmente aquí: no tiene Media Source Extensions, así
   * que hls.js no funciona y el reproductor cae a la reproducción nativa. Es un
   * camino de código distinto y solo se ejerce probándolo.
   */
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'movil', use: { ...devices['iPhone 13'] } },
  ],
  webServer: LOCAL
    ? { command: 'npm run dev', url: BASE, reuseExistingServer: true, timeout: 180_000 }
    : undefined,
});
