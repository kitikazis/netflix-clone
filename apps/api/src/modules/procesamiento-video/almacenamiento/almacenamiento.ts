import { Readable } from 'node:stream';

/** Token DI para inyectar la implementación de almacenamiento activa. */
export const ALMACENAMIENTO = Symbol('ALMACENAMIENTO');

/** Origen de vídeo listo para leer en disco local + su limpieza asociada. */
export interface OrigenMaterializado {
  rutaLocal: string;
  /** Libera recursos temporales (no-op en local; borra la descarga en R2). */
  limpiar(): Promise<void>;
}

/**
 * Instrucción para que el cliente suba el vídeo fuente.
 * - R2: `url` es una URL prefirmada; el cliente hace PUT directo a R2.
 * - local: `url` apunta al endpoint de subida directa de la propia API.
 * En ambos casos el cliente hace `PUT url` con el archivo como cuerpo, y luego
 * usa `clave` como `claveOrigen` al encolar la transcodificación (Fase 5).
 */
export interface DestinoSubida {
  clave: string;
  url: string;
  metodo: 'PUT';
  headers?: Record<string, string>;
  expiraEn?: number; // segundos de validez (solo prefirmadas)
}

/**
 * Abstracción de almacenamiento de media. Aísla el pipeline y las subidas de
 * dónde viven los bytes: disco local (dev) o Cloudflare R2 (prod), mismo contrato.
 */
export interface Almacenamiento {
  /** Deja disponible el vídeo fuente (`claveOrigen`) como archivo local legible. */
  materializarOrigen(claveOrigen: string): Promise<OrigenMaterializado>;

  /** Publica el directorio HLS ya generado bajo un prefijo de destino. */
  publicarHls(dirLocal: string, destinoPrefijo: string): Promise<void>;

  /** URL pública (servible) para una clave de salida (p. ej. el master.m3u8). */
  urlPublica(clave: string): string;

  /** Prepara la subida de un vídeo fuente y devuelve dónde/cómo subirlo. */
  prepararSubida(nombreArchivo: string, contentType: string): Promise<DestinoSubida>;

  /** Persiste un stream como objeto fuente (subida directa / servidor→almacén). */
  guardarStream(clave: string, datos: Readable): Promise<void>;
}
