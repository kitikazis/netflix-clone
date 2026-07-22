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
}
