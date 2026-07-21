import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { EntidadBase } from '@/common/entities/entidad-base';
import { Perfil } from '@/modules/usuarios/entities/perfil.entity';
import { Contenido } from '@/modules/catalogo/entities/contenido.entity';
import { Episodio } from '@/modules/catalogo/entities/episodio.entity';

/**
 * Progreso de reproducción por PERFIL ("continuar viendo").
 * Postgres es la fuente durable; en la Fase 8 Redis mantiene el estado caliente
 * y persiste aquí periódicamente.
 *
 * Unicidad: un progreso por (perfil, contenido) en películas y por
 * (perfil, contenido, episodio) en series. Como episodio_id es NULL en películas
 * y en Postgres los NULL no colisionan, se usan dos índices únicos PARCIALES.
 */
@Entity('progreso_visualizacion')
@Index('uq_progreso_pelicula', ['perfilId', 'contenidoId'], {
  unique: true,
  where: 'episodio_id IS NULL',
})
@Index('uq_progreso_episodio', ['perfilId', 'contenidoId', 'episodioId'], {
  unique: true,
  where: 'episodio_id IS NOT NULL',
})
export class ProgresoVisualizacion extends EntidadBase {
  @Index()
  @Column({ type: 'uuid' })
  perfilId: string;

  @ManyToOne(() => Perfil, (perfil) => perfil.progresos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'perfil_id' })
  perfil: Perfil;

  @Column({ type: 'uuid' })
  contenidoId: string;

  @ManyToOne(() => Contenido, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contenido_id' })
  contenido: Contenido;

  @Column({ type: 'uuid', nullable: true })
  episodioId: string | null;

  @ManyToOne(() => Episodio, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'episodio_id' })
  episodio: Episodio | null;

  // Posición actual y duración total (en segundos) — snapshot para calcular % visto.
  @Column({ type: 'int', default: 0 })
  segundoActual: number;

  @Column({ type: 'int', default: 0 })
  duracionTotal: number;

  @Column({ type: 'boolean', default: false })
  completado: boolean;
}
