import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/redis/redis.constants';
import { Contenido } from '@/modules/catalogo/entities/contenido.entity';
import { Episodio } from '@/modules/catalogo/entities/episodio.entity';
import { ProgresoVisualizacion } from './entities/progreso-visualizacion.entity';
import { GuardarProgresoDto } from './dto/guardar-progreso.dto';

/** Estado caliente por clave, guardado en Redis como JSON. */
interface EstadoCaliente {
  s: number; // segundoActual
  d: number; // duracionTotal
  c: boolean; // completado
}

// Umbral para marcar como "visto" y sacarlo de "continuar viendo".
const UMBRAL_COMPLETADO = 0.9;
// TTL del estado caliente y ventana de escritura diferida a Postgres.
const TTL_CALIENTE_SEG = 60 * 60 * 24 * 30;
const THROTTLE_PERSISTENCIA_SEG = 15;
// Margen de sobre-consulta: ver `continuarViendo`.
const FACTOR_SOBRE_CONSULTA = 3;

/**
 * "Continuar viendo" + historial (Fase 8).
 * Redis es el estado CALIENTE (cada latido actualiza la posición al instante);
 * Postgres es el store DURABLE, con escritura diferida (throttle) para no pegarle
 * a la BD en cada latido. Las lecturas salen de Postgres y se superponen con la
 * posición fresca de Redis.
 */
@Injectable()
export class ProgresoVisualizacionService {
  constructor(
    @InjectRepository(ProgresoVisualizacion)
    private readonly repo: Repository<ProgresoVisualizacion>,
    @InjectRepository(Contenido)
    private readonly contenidoRepo: Repository<Contenido>,
    @InjectRepository(Episodio)
    private readonly episodioRepo: Repository<Episodio>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async guardar(perfilId: string, dto: GuardarProgresoDto) {
    await this.validarActivo(dto);

    const segundoActual = Math.min(dto.segundoActual, dto.duracionTotal);
    const completado = segundoActual >= dto.duracionTotal * UMBRAL_COMPLETADO;
    const estado: EstadoCaliente = { s: segundoActual, d: dto.duracionTotal, c: completado };

    // 1) Estado caliente: siempre, inmediato.
    await this.redis.set(
      this.claveCaliente(perfilId, dto.contenidoId, dto.episodioId),
      JSON.stringify(estado),
      'EX',
      TTL_CALIENTE_SEG,
    );

    // 2) Persistencia diferida: al completar, o si pasó la ventana de throttle.
    const claveThrottle = `pv:cd:${perfilId}:${dto.contenidoId}:${dto.episodioId ?? '_'}`;
    const debePersistir =
      completado ||
      (await this.redis.set(claveThrottle, '1', 'EX', THROTTLE_PERSISTENCIA_SEG, 'NX')) === 'OK';
    if (debePersistir) {
      await this.persistir(perfilId, dto, segundoActual, completado);
    }

    const porcentaje = this.porcentaje(segundoActual, dto.duracionTotal);
    return { segundoActual, duracionTotal: dto.duracionTotal, completado, porcentaje };
  }

  /** Lista "continuar viendo": empezados y no completados, más recientes primero. */
  async continuarViendo(perfilId: string, limite: number) {
    // Se sobre-consulta a propósito: una fila marcada como no completada en
    // Postgres puede haberse completado en caliente sin persistirse todavía, y
    // esas se descartan abajo. Sin margen, pedir N devolvería menos de N sin
    // ninguna forma de reclamar el resto.
    const filas = await this.repo.find({
      where: { perfilId, completado: false },
      relations: { contenido: true, episodio: true },
      order: { fechaActualizacion: 'DESC' },
      take: limite * FACTOR_SOBRE_CONSULTA,
    });

    const calientes = await this.leerCalientes(filas);
    const items = filas.map((fila, i) => this.aItem(fila, calientes[i]));
    return items.filter((item) => item !== null).slice(0, limite);
  }

  async historial(perfilId: string, limite: number) {
    const filas = await this.repo.find({
      where: { perfilId },
      relations: { contenido: true, episodio: true },
      order: { fechaActualizacion: 'DESC' },
      take: limite,
    });
    const calientes = await this.leerCalientes(filas);
    return filas.map((fila, i) => this.aItem(fila, calientes[i], true));
  }

  /**
   * Punto de reanudación de un título/episodio concreto. A diferencia de
   * `continuarViendo`, incluye los completados: al revisar algo terminado el
   * reproductor necesita saber que lo está, para ofrecer empezar de nuevo.
   */
  async posicion(perfilId: string, contenidoId: string, episodioId?: string) {
    const caliente = await this.leerCaliente(perfilId, contenidoId, episodioId);
    if (caliente) {
      return this.aPosicion(caliente.s, caliente.d, caliente.c);
    }

    const fila = await this.repo.findOne({
      where: { perfilId, contenidoId, episodioId: episodioId ?? IsNull() },
      select: { id: true, segundoActual: true, duracionTotal: true, completado: true },
    });
    if (!fila) return null;
    return this.aPosicion(fila.segundoActual, fila.duracionTotal, fila.completado);
  }

  async eliminar(perfilId: string, contenidoId: string, episodioId?: string): Promise<void> {
    await this.repo.delete({
      perfilId,
      contenidoId,
      episodioId: episodioId ?? IsNull(),
    });
    await this.redis.del(this.claveCaliente(perfilId, contenidoId, episodioId));
  }

  // --- internos ---

  private claveCaliente(perfilId: string, contenidoId: string, episodioId?: string): string {
    return `pv:${perfilId}:${contenidoId}:${episodioId ?? '_'}`;
  }

  private async validarActivo(dto: GuardarProgresoDto): Promise<void> {
    const existe = await this.contenidoRepo.exists({ where: { id: dto.contenidoId } });
    if (!existe) {
      throw new NotFoundException('Contenido no encontrado');
    }
    if (dto.episodioId) {
      const episodio = await this.episodioRepo.findOne({
        where: { id: dto.episodioId },
        select: { id: true, contenidoId: true },
      });
      if (!episodio || episodio.contenidoId !== dto.contenidoId) {
        throw new NotFoundException('Episodio no encontrado en este contenido');
      }
    }
  }

  private async persistir(
    perfilId: string,
    dto: GuardarProgresoDto,
    segundoActual: number,
    completado: boolean,
  ): Promise<void> {
    const existente = await this.repo.findOne({
      where: {
        perfilId,
        contenidoId: dto.contenidoId,
        episodioId: dto.episodioId ?? IsNull(),
      },
    });
    if (existente) {
      existente.segundoActual = segundoActual;
      existente.duracionTotal = dto.duracionTotal;
      existente.completado = completado;
      await this.repo.save(existente);
    } else {
      await this.repo.save(
        this.repo.create({
          perfilId,
          contenidoId: dto.contenidoId,
          episodioId: dto.episodioId ?? null,
          segundoActual,
          duracionTotal: dto.duracionTotal,
          completado,
        }),
      );
    }
  }

  /** Mapea una fila a la forma de respuesta, superponiendo la posición caliente. */
  private aItem(
    fila: ProgresoVisualizacion,
    caliente: EstadoCaliente | null,
    incluirCompletados = false,
  ) {
    const segundoActual = caliente?.s ?? fila.segundoActual;
    const duracionTotal = caliente?.d ?? fila.duracionTotal;
    const completado = caliente?.c ?? fila.completado;

    if (completado && !incluirCompletados) return null;

    return {
      contenido: {
        id: fila.contenido.id,
        slug: fila.contenido.slug,
        titulo: fila.contenido.titulo,
        tipo: fila.contenido.tipo,
        posterUrl: fila.contenido.posterUrl,
        backdropUrl: fila.contenido.backdropUrl,
        hlsPlaylistUrl: fila.contenido.hlsPlaylistUrl,
      },
      episodio: fila.episodio
        ? {
            id: fila.episodio.id,
            temporada: fila.episodio.temporada,
            numeroEpisodio: fila.episodio.numeroEpisodio,
            titulo: fila.episodio.titulo,
            hlsPlaylistUrl: fila.episodio.hlsPlaylistUrl,
          }
        : null,
      segundoActual,
      duracionTotal,
      completado,
      porcentaje: this.porcentaje(segundoActual, duracionTotal),
      actualizado: fila.fechaActualizacion,
    };
  }

  private async leerCaliente(
    perfilId: string,
    contenidoId: string,
    episodioId?: string,
  ): Promise<EstadoCaliente | null> {
    const crudo = await this.redis.get(this.claveCaliente(perfilId, contenidoId, episodioId));
    return this.parsearCaliente(crudo);
  }

  /** Lectura en lote (un solo round-trip) del estado caliente de varias filas. */
  private async leerCalientes(filas: ProgresoVisualizacion[]): Promise<(EstadoCaliente | null)[]> {
    if (filas.length === 0) return [];
    const claves = filas.map((fila) =>
      this.claveCaliente(fila.perfilId, fila.contenidoId, fila.episodioId ?? undefined),
    );
    const crudos = await this.redis.mget(...claves);
    return crudos.map((crudo) => this.parsearCaliente(crudo));
  }

  private parsearCaliente(crudo: string | null): EstadoCaliente | null {
    if (!crudo) return null;
    try {
      return JSON.parse(crudo) as EstadoCaliente;
    } catch {
      return null;
    }
  }

  private aPosicion(segundoActual: number, duracionTotal: number, completado: boolean) {
    return {
      segundoActual,
      duracionTotal,
      completado,
      porcentaje: this.porcentaje(segundoActual, duracionTotal),
    };
  }

  private porcentaje(segundoActual: number, duracionTotal: number): number {
    if (duracionTotal <= 0) return 0;
    return Math.min(100, Math.round((segundoActual / duracionTotal) * 100));
  }
}
