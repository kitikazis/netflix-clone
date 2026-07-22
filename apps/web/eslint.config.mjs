// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';
import hooks from 'eslint-plugin-react-hooks';

/**
 * Reglas del front.
 *
 * Se componen los plugins a mano en vez de tirar de `eslint-config-next`
 * porque ese paquete aún se publica en el formato antiguo y el puente de
 * compatibilidad se rompe con ESLint 9. Aquí se ve exactamente qué se aplica.
 *
 * De todo lo que traen, dos reglas justifican el montaje por sí solas: las
 * dependencias de los hooks —de donde salieron los latidos de progreso que se
 * mandaban de más— y el aviso de usar `<img>` en lugar del componente de Next,
 * que en un catálogo lleno de carátulas decide entre servir originales de
 * varios megas o miniaturas.
 */
export default tseslint.config(
  // Con barras y comodín: en el formato plano, `.next` a secas solo tapa la
  // entrada, no lo que hay dentro, y el linter se pone a revisar el bundle.
  {
    ignores: [
      '**/.next/**',
      '**/node_modules/**',
      '**/.netlify/**',
      '**/out/**',
      '**/coverage/**',
      'next-env.d.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { '@next/next': next, 'react-hooks': hooks },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      // Solo las dos reglas clásicas de hooks. La versión 7 del plugin trae
      // además las del compilador de React, y una de ellas prohíbe mutar
      // cualquier valor recibido por props: el reproductor no puede funcionar
      // así, porque adelantar diez segundos ES escribir en `video.currentTime`.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Ficheros que corren en Node, no en el navegador.
    files: ['*.mjs', '*.ts', 'e2e/**'],
    languageOptions: { globals: { process: 'readonly', __dirname: 'readonly' } },
  },
);
