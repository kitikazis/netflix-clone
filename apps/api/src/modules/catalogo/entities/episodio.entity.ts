import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { EntidadBase } from '@/common/entities/entidad-base';
import { Contenido } from './contenido.entity';

/**
 * Episodio de una serie. Único por (contenido, temporada, número).
 */
@Entity('episodios')
@Unique('uq_episodio_contenido_temporada_numero', [
  'contenidoId',
  'temporada',
  'numeroEpisodio',
])
export class Episodio extends EntidadBase {
  @Index()
  @Column({ type: 'uuid' })
  contenidoId: string;

  @ManyToOne(() => Contenido, (contenido) => contenido.episodios, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contenido_id' })
  contenido: Contenido;

  @Column({ type: 'smallint' })
  temporada: number;

  @Column({ type: 'smallint' })
  numeroEpisodio: number;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  sinopsis: string | null;

  @Column({ type: 'int', nullable: true })
  duracionMinutos: number | null;
}
