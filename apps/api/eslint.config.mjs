// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    // `scripts/` son utilidades sueltas que se lanzan con `node`, fuera del
    // tsconfig del servicio: el linter con tipos no puede analizarlas.
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'scripts',
      'eslint.config.mjs',
      'jest.config.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // `ignoreRestSiblings` permite el idioma de quitar un campo desestructurando
      // (`const { contrasenaHash: _, ...publico } = usuario`), que es como se
      // evita filtrar el hash de la contraseña en las respuestas.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
);
