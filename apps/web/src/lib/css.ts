/**
 * URL saneada para interpolar en `background-image: url("…")`.
 *
 * Los pósters y backdrops vienen del catálogo, así que son datos, no
 * constantes: una comilla o un paréntesis dentro de la URL cerraría la
 * declaración CSS. Se limitan los esquemas a http(s) y se escapan los
 * caracteres que pueden escaparse de las comillas.
 */
export function urlCss(url: string | null | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return url.replace(/["'\\()\s]/g, encodeURIComponent);
}

/**
 * Estilo de fondo con solo la imagen. El velo que garantiza la legibilidad del
 * texto lo pone el CSS (`.hero::after`), no cada página: así el degradado vive
 * junto a los colores del tema y no hay que repetirlo en cada llamada.
 */
export function fondoImagen(
  url: string | null | undefined,
): { backgroundImage: string; backgroundSize: string; backgroundPosition: string } | undefined {
  const limpia = urlCss(url);
  return limpia
    ? {
        backgroundImage: `url("${limpia}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 20%',
      }
    : undefined;
}
