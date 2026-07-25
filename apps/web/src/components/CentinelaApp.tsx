'use client';

import { useEffect } from 'react';

/**
 * Señal de que la aplicación llegó a montarse en el cliente.
 *
 * Va de la mano del vigía ES5 del layout: si React hidrata bien, este efecto
 * corre y levanta la bandera; si el navegador no entiende el bundle y revienta
 * al interpretarlo, el efecto nunca corre, la bandera se queda baja y el vigía
 * enseña el aviso con el enlace al diagnóstico en vez de dejar la pantalla en
 * blanco. Si la hidratación fue solo lenta y el aviso ya se había mostrado, se
 * oculta aquí para no molestar a un móvil que sí funcionaba, solo que despacio.
 */
export function CentinelaApp() {
  useEffect(() => {
    (window as unknown as { __kitiflixOk?: boolean }).__kitiflixOk = true;
    const aviso = document.getElementById('sin-app');
    if (aviso) aviso.hidden = true;
  }, []);

  return null;
}
