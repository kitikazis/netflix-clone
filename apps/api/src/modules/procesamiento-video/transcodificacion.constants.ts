/** Nombre de la cola BullMQ de transcodificación. */
export const COLA_TRANSCODIFICACION = 'transcodificacion';

/** Nombre del job dentro de la cola. */
export const JOB_TRANSCODIFICAR = 'transcodificar';

/** Qué entidad del catálogo posee el vídeo a transcodificar. */
export enum TipoActivo {
  CONTENIDO = 'CONTENIDO', // película
  EPISODIO = 'EPISODIO',
}

/** Payload del job encolado. */
export interface DatosJobTranscodificacion {
  tipo: TipoActivo;
  activoId: string;
  claveOrigen: string;
  /**
   * Almacenamiento con el que se encoló, para que no lo coja un worker que
   * guarda en otro sitio.
   *
   * La cola vive en un Redis compartido, así que cualquier instancia conectada
   * —la de desarrollo y la desplegada— compite por los mismos trabajos. Si una
   * está configurada con `local` y otra con `r2`, la que gane escribe el vídeo
   * en el sitio equivocado y el título queda apuntando a un disco que nadie
   * más ve. Pasó, y no dio ni un error: el estado llegaba a LISTO.
   *
   * Opcional porque los trabajos encolados antes de este campo no lo traen;
   * esos se procesan como hasta ahora.
   */
  almacenamiento?: 'local' | 'r2';
}
