import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Índices en las claves ajenas que no los tenían.
 *
 * Postgres indexa la columna referenciada, pero NO la que referencia. Sin ese
 * índice, cada borrado en la tabla padre obliga a recorrer entera la hija para
 * comprobar que no queden referencias: borrar una cuenta escanea `perfiles`,
 * borrar un título escanea `progreso_visualizacion` y `subidas_video`. Con
 * pocas filas no se nota; con muchas, un borrado se vuelve eterno y bloquea.
 *
 * También aceleran las uniones del panel, que cruzan estas tablas.
 *
 * Se crean de forma normal, no CONCURRENTLY: estas tablas tienen decenas de
 * filas y el índice se construye al instante, así que el bloqueo es
 * inapreciable. CONCURRENTLY exigiría sacar la migración de la transacción
 * global, y no compensa complicar el runner por esto.
 */
export class IndicesEnClavesAjenas1784970000000 implements MigrationInterface {
  name = 'IndicesEnClavesAjenas1784970000000';

  private readonly indices: Array<[string, string, string]> = [
    ['idx_perfiles_usuario', 'perfiles', 'usuario_id'],
    ['idx_progreso_contenido', 'progreso_visualizacion', 'contenido_id'],
    ['idx_subidas_usuario', 'subidas_video', 'subido_por_id'],
    ['idx_subidas_contenido', 'subidas_video', 'contenido_id'],
    ['idx_subidas_episodio', 'subidas_video', 'episodio_id'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [nombre, tabla, columna] of this.indices) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${nombre}" ON "${tabla}" ("${columna}")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [nombre] of this.indices) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${nombre}"`);
    }
  }
}
