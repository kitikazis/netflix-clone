import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Base para todas las entidades: PK uuid + timestamps.
 * No lleva @Entity (es abstracta) y el archivo NO termina en `.entity.ts`,
 * así que el glob de migraciones no la trata como tabla.
 * SnakeNamingStrategy deriva las columnas: fechaCreacion -> fecha_creacion, etc.
 */
export abstract class EntidadBase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fechaCreacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fechaActualizacion: Date;
}
