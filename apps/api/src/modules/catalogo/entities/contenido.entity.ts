import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { EntidadBase } from '@/common/entities/entidad-base';
import { TipoContenido } from '../enums/tipo-contenido.enum';
import { Episodio } from './episodio.entity';
import { Genero } from './genero.entity';

/**
 * Título del catálogo: película o serie (discriminado por `tipo`).
 * Las series agrupan episodios; las películas no.
 */
@Entity('contenido')
export class Contenido extends EntidadBase {
  @Column({
    type: 'enum',
    enum: TipoContenido,
    enumName: 'tipo_contenido',
  })
  tipo: TipoContenido;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  sinopsis: string | null;

  @Column({ type: 'smallint', nullable: true })
  anioLanzamiento: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  clasificacionEdad: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  posterUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  backdropUrl: string | null;

  // Solo aplica a películas; en series la duración vive en cada episodio.
  @Column({ type: 'int', nullable: true })
  duracionMinutos: number | null;

  @Index()
  @Column({ type: 'boolean', default: false })
  destacado: boolean;

  @Index()
  @Column({ type: 'boolean', default: false })
  publicado: boolean;

  @ManyToMany(() => Genero, (genero) => genero.contenidos)
  @JoinTable({
    name: 'contenido_generos',
    joinColumn: { name: 'contenido_id' },
    inverseJoinColumn: { name: 'genero_id' },
  })
  generos: Genero[];

  @OneToMany(() => Episodio, (episodio) => episodio.contenido)
  episodios: Episodio[];
}
