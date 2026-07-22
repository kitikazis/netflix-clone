/**
 * Estado del pipeline de transcodificación (ffmpeg → HLS) de un activo de vídeo
 * (una película o un episodio). Lo gestiona ProcesamientoVideoModule (Fase 5).
 */
export enum EstadoProcesamiento {
  PENDIENTE = 'PENDIENTE', // sin vídeo asociado / aún no encolado
  EN_COLA = 'EN_COLA', // job creado en BullMQ, esperando worker
  PROCESANDO = 'PROCESANDO', // ffmpeg en ejecución
  LISTO = 'LISTO', // HLS disponible (hlsPlaylistUrl poblado)
  ERROR = 'ERROR', // falló; ver errorProcesamiento
}
