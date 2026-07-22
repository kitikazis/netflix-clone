import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    // jsdom porque la capa de sesión usa localStorage, atob y window.
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    restoreMocks: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
