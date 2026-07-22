import { Fraunces, Inter } from 'next/font/google';

/**
 * Tipografías servidas por next/font: se auto-hospedan en el despliegue, así
 * que no hay petición a Google en tiempo de ejecución ni salto de maquetación
 * al cargar.
 *
 * Fraunces para titulares. Es una serif con eje de "suavidad" (`SOFT`), que es
 * justo lo que pide el encargo: los remates dan elegancia y la suavidad evita
 * que resulte severa. Además casi ningún servicio de streaming usa serif, lo
 * que distingue el conjunto sin recurrir a artificios.
 */
export const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-display',
  axes: ['SOFT', 'WONK'],
});

/** Inter para interfaz y texto corrido: neutra y muy legible en tamaños pequeños. */
export const texto = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-texto',
});
