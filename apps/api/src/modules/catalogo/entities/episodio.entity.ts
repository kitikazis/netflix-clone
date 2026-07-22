import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { EntidadBase } from '@/common/entities/entidad-base';
import { EstadoProcesamiento } from '../enums/estado-procesamiento.enum';
import { Contenido } from './contenido.entity';

/**
 * Episodio de una serie. Único por (contenido, temporada, número).
 */
@Entity('episodios')
@Unique('uq_episodio_contenido_temporada_numero', ['contenidoId', 'temporada', 'numeroEpisodio'])
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

  // --- Pipeline de vídeo (cada episodio se transcodifica por separado) ---

  @Index('idx_episodio_estado_procesamiento')
  @Column({
    type: 'enum',
    enum: EstadoProcesamiento,
    enumName: 'estado_procesamiento',
    default: EstadoProcesamiento.PENDIENTE,
  })
  estadoProcesamiento: EstadoProcesamiento;

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoOrigenClave: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  hlsPlaylistUrl: string | null;

  @Column({ type: 'int', nullable: true })
  duracionSegundos: number | null;

  @Column({ type: 'text', nullable: true })
  errorProcesamiento: string | null;
}
