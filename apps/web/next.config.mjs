/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
