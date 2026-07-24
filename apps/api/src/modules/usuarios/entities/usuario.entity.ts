import { Column, Entity, Index, OneToMany } from 'typeorm';
import { EntidadBase } from '@/common/entities/entidad-base';
import { RolUsuario } from '../enums/rol-usuario.enum';
import { ProveedorRegistro } from '../enums/proveedor-registro.enum';
import { Perfil } from './perfil.entity';

/**
 * Cuenta de usuario (nivel de facturación/login). Contiene 1..N perfiles.
 */
@Entity('usuarios')
export class Usuario extends EntidadBase {
  // Único, pero opcional: una cuenta de WhatsApp no tiene correo.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  correo: string | null;

  /** Teléfono en formato internacional (+51999…). Solo en cuentas de WhatsApp. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  /**
   * Nunca se selecciona por defecto: hay que pedirlo explícitamente (addSelect).
   *
   * Es nulo en las cuentas creadas con Google, que nunca han tenido contraseña.
   * Guardar un hash inventado sería peor: parecería una credencial válida y
   * nadie podría iniciar sesión con ella jamás.
   */
  @Column({ type: 'varchar', length: 255, select: false, nullable: true })
  contrasenaHash: string | null;

  /** Nombre tal y como lo da el proveedor; nulo si se registró con correo. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  nombre: string | null;

  /** Foto del proveedor. Se guarda la URL, no la imagen: es suya y ya la sirve. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  fotoUrl: string | null;

  @Column({
    type: 'enum',
    enum: ProveedorRegistro,
    enumName: 'proveedor_registro',
    default: ProveedorRegistro.LOCAL,
  })
  proveedor: ProveedorRegistro;

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
