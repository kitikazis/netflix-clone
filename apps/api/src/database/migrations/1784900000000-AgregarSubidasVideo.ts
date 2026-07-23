import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registro de las subidas de vídeo.
 *
 * De una subida solo quedaba rastro si acababa asignada a un título, y aun así
 * era una clave suelta en una columna. Mirando el bucket no se sabía quién
 * había subido cada archivo ni para qué, y una subida que no llegara a
 * asignarse no existía para nadie aunque ocupara espacio.
 *
 * Las claves ajenas van con SET NULL a propósito: si se borra la cuenta o el
 * título, el archivo sigue existiendo en el almacenamiento, y quedarse sin la
 * fila que lo describe es peor que quedarse con un hueco. Por eso también se
 * guarda una copia del correo de quien subió.
 */
export class AgregarSubidasVideo1784900000000 implements MigrationInterface {
  name = 'AgregarSubidasVideo1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subidas_video" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "clave" character varying(500) NOT NULL,
        "nombre_archivo" character varying(255) NOT NULL,
        "content_type" character varying(120) NOT NULL,
        "tamano_bytes" bigint,
        "subido_por_id" uuid,
        "subido_por_correo" character varying(255),
        "contenido_id" uuid,
        "episodio_id" uuid,
        "fecha_confirmacion" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "pk_subidas_video" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_subidas_video_clave" ON "subidas_video" ("clave")`,
    );
    // Se consulta ordenado por fecha en el panel.
    await queryRunner.query(
      `CREATE INDEX "idx_subidas_video_fecha" ON "subidas_video" ("fecha_creacion")`,
    );

    await queryRunner.query(`
      ALTER TABLE "subidas_video"
      ADD CONSTRAINT "fk_subidas_video_usuario"
      FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "subidas_video"
      ADD CONSTRAINT "fk_subidas_video_contenido"
      FOREIGN KEY ("contenido_id") REFERENCES "contenido"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "subidas_video"
      ADD CONSTRAINT "fk_subidas_video_episodio"
      FOREIGN KEY ("episodio_id") REFERENCES "episodios"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subidas_video"`);
  }
}
