import { EsqueletoCatalogo } from '@/components/Esqueleto';

/**
 * Estado de carga de la home.
 *
 * Vive en el grupo `(inicio)` a propósito: un `loading.tsx` en la raíz de `app`
 * envuelve TODAS las rutas en una frontera de Suspense, y entonces Next empieza
 * a enviar la respuesta antes de resolver la página. Con la respuesta ya
 * empezada, el `notFound()` de /titulo y /ver no puede cambiar el estado HTTP y
 * el 404 se sirve como 200 (un "soft 404"). Acotándolo al grupo, esas rutas
 * conservan su 404 de verdad.
 */
export default function Cargando() {
  return <EsqueletoCatalogo />;
}
