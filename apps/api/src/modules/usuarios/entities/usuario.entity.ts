import { Column, Entity, Index, OneToMany } from 'typeorm';
import { EntidadBase } from '@/common/entities/entidad-base';
import { RolUsuario } from '../enums/rol-usuario.enum';
import { Perfil } from './perfil.entity';

/**
 * Cuenta de usuario (nivel de facturación/login). Contiene 1..N perfiles.
 */
@Entity('usuarios')
export class Usuario extends EntidadBase {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  correo: string;

  // Nunca se selecciona por defecto: hay que pedirlo explícitamente (addSelect).
  @Column({ type: 'varchar', length: 255, select: false })
  contrasenaHash: string;

  @Column({
    type: 'enum',
    enum: RolUsuario,
    enumName: 'rol_usuario',
    default: RolUsuario.USUARIO,
  })
  rol: RolUsuario;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => Perfil, (perfil) => perfil.usuario)
  perfiles: Perfil[];
}
