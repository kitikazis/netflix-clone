import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

/** Un peldaño de la escalera de calidad HLS. */
interface Rendicion {
  nombre: string;
  altura: number;
  bitrateVideoKbps: number;
  bitrateAudioKbps: number;
}

// Escalera multi-bitrate. Nunca se hace upscaling por encima del alto de origen.
const ESCALERA: Rendicion[] = [
  { nombre: '360p', altura: 360, bitrateVideoKbps: 800, bitrateAudioKbps: 96 },
  { nombre: '720p', altura: 720, bitrateVideoKbps: 2800, bitrateAudioKbps: 128 },
  { nombre: '1080p', altura: 1080, bitrateVideoKbps: 5000, bitrateAudioKbps: 192 },
];

const NOMBRE_MASTER = 'master.m3u8';

export interface ResultadoHls {
  master: string; // nombre del archivo master (relativo al dir de salida)
  duracionSegundos: number;
}

interface Sonda {
  duracionSegundos: number;
  ancho: number;
  alto: number;
}

/**
 * Envoltura de ffmpeg/ffprobe (binarios estáticos empaquetados, sin dependencia
 * del sistema). Genera HLS VOD multi-bitrate con playlist maestra.
 */
@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  constructor() {
    if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobeStatic.path);
  }

  /** Metadatos del vídeo fuente (duración + dimensiones del stream de vídeo). */
  sondear(entrada: string): Promise<Sonda> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(entrada, (err, data) => {
        if (err) return reject(err as Error);
        const video = data.streams.find((s) => s.codec_type === 'video');
        if (!video) return reject(new Error('El archivo no contiene stream de vídeo'));
        resolve({
          duracionSegundos: Math.round(Number(data.format.duration ?? 0)),
          ancho: video.width ?? 0,
          alto: video.height ?? 0,
        });
      });
    });
  }

  /**
   * Transcodifica `entrada` a HLS dentro de `dirSalida` y escribe la playlist
   * maestra. Devuelve el nombre del master y la duración detectada.
   */
  async generarHls(
    entrada: string,
    dirSalida: string,
    onProgreso?: (porcentaje: number) => void,
  ): Promise<ResultadoHls> {
    const sonda = await this.sondear(entrada);
    const rendiciones = this.seleccionarRendiciones(sonda.alto);

    for (let i = 0; i < rendiciones.length; i += 1) {
      const r = rendiciones[i];
      this.logger.log(`Transcodificando rendición ${r.nombre} (${entrada})`);
      await this.transcodificarRendicion(entrada, dirSalida, r, (p) => {
        // Progreso global aproximado: peldaño actual + progreso del peldaño.
        if (onProgreso) {
          onProgreso(Math.round(((i + p / 100) / rendiciones.length) * 100));
        }
      });
    }

    await this.escribirMaster(dirSalida, rendiciones, sonda);
    return { master: NOMBRE_MASTER, duracionSegundos: sonda.duracionSegundos };
  }

  private seleccionarRendiciones(altoOrigen: number): Rendicion[] {
    if (altoOrigen <= 0) return [ESCALERA[0]];
    const aplicables = ESCALERA.filter((r) => r.altura <= altoOrigen);
    // Si el origen es más pequeño que el peldaño mínimo, transcodifica a su alto.
    if (aplicables.length === 0) {
      const alto = altoOrigen % 2 === 0 ? altoOrigen : altoOrigen - 1;
      return [{ ...ESCALERA[0], nombre: `${alto}p`, altura: alto }];
    }
    return aplicables;
  }

  private transcodificarRendicion(
    entrada: string,
    dirSalida: string,
    r: Rendicion,
    onProgreso: (porcentaje: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(entrada)
        .videoCodec('libx264')
        .audioCodec('aac')
        .addOptions([
          '-vf',
          `scale=-2:${r.altura}`,
          '-profile:v',
          'main',
          '-preset',
          'veryfast',
          '-crf',
          '20',
          '-sc_threshold',
          '0',
          '-g',
          '48',
          '-keyint_min',
          '48',
          '-b:v',
          `${r.bitrateVideoKbps}k`,
          '-maxrate',
          `${Math.round(r.bitrateVideoKbps * 1.07)}k`,
          '-bufsize',
          `${r.bitrateVideoKbps * 2}k`,
          '-b:a',
          `${r.bitrateAudioKbps}k`,
          '-ac',
          '2',
          '-hls_time',
          '6',
          '-hls_playlist_type',
          'vod',
          '-hls_segment_filename',
          join(dirSalida, `${r.nombre}_%03d.ts`),
        ])
        .output(join(dirSalida, `${r.nombre}.m3u8`))
        .on('progress', (p) => onProgreso(Math.min(100, p.percent ?? 0)))
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /** Escribe el master.m3u8 que referencia cada variante con su ancho de banda. */
  private async escribirMaster(
    dirSalida: string,
    rendiciones: Rendicion[],
    sonda: Sonda,
  ): Promise<void> {
    const lineas = ['#EXTM3U', '#EXT-X-VERSION:3'];
    for (const r of rendiciones) {
      const bandaKbps = r.bitrateVideoKbps + r.bitrateAudioKbps;
      const ancho =
        sonda.alto > 0 ? this.par(Math.round((sonda.ancho * r.altura) / sonda.alto)) : 0;
      const resolucion = ancho > 0 ? `,RESOLUTION=${ancho}x${r.altura}` : '';
      lineas.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandaKbps * 1000}${resolucion}`);
      lineas.push(`${r.nombre}.m3u8`);
    }
    await writeFile(join(dirSalida, NOMBRE_MASTER), lineas.join('\n') + '\n', 'utf8');
  }

  private par(n: number): number {
    return n % 2 === 0 ? n : n + 1;
  }
}
