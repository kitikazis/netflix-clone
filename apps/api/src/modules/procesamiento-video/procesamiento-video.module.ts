import { Module } from '@nestjs/common';

/**
 * Procesamiento de video: jobs de BullMQ con ffmpeg → HLS (multi-bitrate) — Fase 5,
 * más subida/almacenamiento en Cloudflare R2 — Fase 6.
 */
@Module({})
export class ProcesamientoVideoModule {}
