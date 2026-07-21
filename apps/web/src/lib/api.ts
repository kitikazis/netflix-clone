/**
 * URL base de la API. Durante el SSR, el servidor de Next llama a la API por
 * su URL interna (no la del navegador). Configurable vía env para prod.
 */
export const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
