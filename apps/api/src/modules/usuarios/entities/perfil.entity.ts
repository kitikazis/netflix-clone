import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { EntidadBase } from '@/common/entities/entidad-base';
import { ProgresoVisualizacion } from '@/modules/progreso-visualizacion/entities/progreso-visualizacion.entity';
import { Usuario } from './usuario.entity';

/**
 * Perfil dentro de una cuenta (estilo Netflix: varios perfiles por usuario).
 */
@Entity('perfiles')
export class Perfil extends EntidadBase {
  @Column({ type: 'uuid' })
  usuarioId: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.perfiles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'boolean', default: false })
  esInfantil: boolean;

  @Column({ type: 'varchar', length: 10, default: 'es' })
  idioma: string;

  @OneToMany(() => ProgresoVisualizacion, (progreso) => progreso.perfil)
  progresos: ProgresoVisualizacion[];
}
