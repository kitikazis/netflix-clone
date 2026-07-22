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

/** Estilo de fondo con degradado + imagen, o `undefined` si no hay imagen. */
export function fondoConDegradado(
  url: string | null | undefined,
  degradado: string,
): { backgroundImage: string } | undefined {
  const limpia = urlCss(url);
  return limpia ? { backgroundImage: `${degradado}, url("${limpia}")` } : undefined;
}
