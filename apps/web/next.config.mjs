import { join } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // `standalone` empaqueta un servidor mínimo con solo las dependencias que el
  // trazado detecta como usadas, en vez de arrastrar node_modules entero a la
  // imagen. Solo se activa al construir la imagen Docker (BUILD_DOCKER=1):
  // las plataformas que despliegan Next por su cuenta (Netlify, Vercel) usan su
  // propio adaptador y esta salida les estorba.
  ...(process.env.BUILD_DOCKER === '1'
    ? {
        output: 'standalone',
        // En un monorepo el trazado arranca en apps/web y se dejaría fuera el
        // node_modules izado a la raíz. Hay que apuntarlo al repo.
        outputFileTracingRoot: join(import.meta.dirname, '../../'),
      }
    : {}),

  images: {
    // Los pósters y backdrops son URLs arbitrarias guardadas en el catálogo
    // (R2, un CDN, TMDB…), así que el optimizador tiene que aceptar cualquier
    // host. En un despliegue real conviene acotarlo a los dominios propios.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

export default nextConfig;
