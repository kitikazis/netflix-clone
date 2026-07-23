import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { EntidadBase } from '@/common/entities/entidad-base';
import { Usuario } from '@/modules/usuarios/entities/usuario.entity';
import { Contenido } from '@/modules/catalogo/entities/contenido.entity';
import { Episodio } from '@/modules/catalogo/entities/episodio.entity';

/**
 * Un vídeo subido al almacenamiento.
 *
 * Hasta ahora, de una subida solo quedaba rastro si acababa asignada a un
 * título: la clave se guardaba en su fila y nada más. Mirando el bucket no
 * había forma de saber quién había subido cada archivo, cuándo, ni para qué;
 * y una subida que no llegara a asignarse no existía para nadie, aunque
 * estuviera ocupando espacio.
 *
 * Aquí queda cada una con su procedencia. El archivo NO se borra al
 * transcodificar: es el original, y sin él no se puede volver a convertir si
 * cambia la escalera de calidades o se corrompe la salida.
 */
@Entity('subidas_video')
export class SubidaVideo extends EntidadBase {
  /** Clave del objeto en el almacenamiento; única por diseño de la clave. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 500 })
  clave: string;

  /** Nombre tal cual lo tenía el archivo en el ordenador de quien lo subió. */
  @Column({ type: 'varchar', length: 255 })
  nombreArchivo: string;

  @Column({ type: 'varchar', length: 120 })
  contentType: string;

  /** Se conoce al confirmar, no al pedir la URL: hasta entonces es null. */
  @Column({ type: 'bigint', nullable: true })
  tamanoBytes: string | null;

  /**
   * Quién la subió. Se conserva aunque la cuenta se borre —de ahí el SET NULL—
   * porque el archivo sigue ahí y perder su procedencia es peor que un hueco.
   */
  @Column({ type: 'uuid', nullable: true })
  subidoPorId: string | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subido_por_id' })
  subidoPor: Usuario | null;

  /** Correo de quien subió, congelado: sobrevive al borrado de la cuenta. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  subidoPorCorreo: string | null;

  // --- A qué se asignó (uno de los dos, o ninguno si aún no se ha usado) ---

  @Column({ type: 'uuid', nullable: true })
  contenidoId: string | null;

  @ManyToOne(() => Contenido, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'contenido_id' })
  contenido: Contenido | null;

  @Column({ type: 'uuid', nullable: true })
  episodioId: string | null;

  @ManyToOne(() => Episodio, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'episodio_id' })
  episodio: Episodio | null;

  /** Fecha en que se comprobó que el archivo estaba de verdad en el almacén. */
  @Column({ type: 'timestamptz', nullable: true })
  fechaConfirmacion: Date | null;
}
