import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { EntidadBase } from '@/common/entities/entidad-base';
import { Contenido } from './contenido.entity';

/** Género del catálogo (Acción, Drama, ...). */
@Entity('generos')
export class Genero extends EntidadBase {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80 })
  nombre: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80 })
  slug: string;

  @ManyToMany(() => Contenido, (contenido) => contenido.generos)
  contenidos: Contenido[];
}
