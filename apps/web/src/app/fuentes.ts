import { Bodoni_Moda, Familjen_Grotesk } from 'next/font/google';

/**
 * Tipografías servidas por next/font: se auto-hospedan en el despliegue, así
 * que no hay petición a Google en tiempo de ejecución ni salto de maquetación.
 *
 * Bodoni para los titulares. Su contraste extremo entre trazo grueso y fino es
 * el de los carteles de cine impresos y el de las cabeceras de revista; sobre
 * papel crema y en tamaños grandes es donde da lo mejor de sí. En cuerpos
 * pequeños los trazos finos desaparecen, así que aquí solo se usa a partir de
 * ~1.4rem.
 */
export const display = Bodoni_Moda({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-display',
  weight: ['400', '500', '600'],
});

/**
 * Familjen Grotesk para interfaz y texto corrido. Es una grotesca con algo de
 * carácter —no la neutralidad de catálogo de Inter— y aguanta bien los tamaños
 * pequeños de los metadatos.
 */
export const texto = Familjen_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-texto',
});
