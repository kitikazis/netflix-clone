import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 5 (pipeline de vídeo): estado de transcodificación + metadatos HLS en los
 * activos de vídeo. La película usa las columnas de `contenido`; cada episodio de
 * una serie las suyas en `episodios`.
 */
export class AgregarProcesamientoVideo1784800000001 implements MigrationInterface {
  name = 'AgregarProcesamientoVideo1784800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."estado_procesamiento" AS ENUM('PENDIENTE', 'EN_COLA', 'PROCESANDO', 'LISTO', 'ERROR')`,
    );

    // --- contenido (películas) ---
    await queryRunner.query(
      `ALTER TABLE "contenido" ADD "estado_procesamiento" "public"."estado_procesamiento" NOT NULL DEFAULT 'PENDIENTE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "contenido" ADD "video_origen_clave" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "contenido" ADD "hls_playlist_url" character varying(500)`,
    );
    await queryRunner.query(`ALTER TABLE "contenido" ADD "duracion_segundos" integer`);
    await queryRunner.query(`ALTER TABLE "contenido" ADD "error_procesamiento" text`);
    await queryRunner.query(
      `CREATE INDEX "idx_contenido_estado_procesamiento" ON "contenido" ("estado_procesamiento")`,
    );

    // --- episodios ---
    await queryRunner.query(
      `ALTER TABLE "episodios" ADD "estado_procesamiento" "public"."estado_procesamiento" NOT NULL DEFAULT 'PENDIENTE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "episodios" ADD "video_origen_clave" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "episodios" ADD "hls_playlist_url" character varying(500)`,
    );
    await queryRunner.query(`ALTER TABLE "episodios" ADD "duracion_segundos" integer`);
    await queryRunner.query(`ALTER TABLE "episodios" ADD "error_procesamiento" text`);
    await queryRunner.query(
      `CREATE INDEX "idx_episodio_estado_procesamiento" ON "episodios" ("estado_procesamiento")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_episodio_estado_procesamiento"`);
    await queryRunner.query(`ALTER TABLE "episodios" DROP COLUMN "error_procesamiento"`);
    await queryRunner.query(`ALTER TABLE "episodios" DROP COLUMN "duracion_segundos"`);
    await queryRunner.query(`ALTER TABLE "episodios" DROP COLUMN "hls_playlist_url"`);
    await queryRunner.query(`ALTER TABLE "episodios" DROP COLUMN "video_origen_clave"`);
    await queryRunner.query(`ALTER TABLE "episodios" DROP COLUMN "estado_procesamiento"`);

    await queryRunner.query(`DROP INDEX "public"."idx_contenido_estado_procesamiento"`);
    await queryRunner.query(`ALTER TABLE "contenido" DROP COLUMN "error_procesamiento"`);
    await queryRunner.query(`ALTER TABLE "contenido" DROP COLUMN "duracion_segundos"`);
    await queryRunner.query(`ALTER TABLE "contenido" DROP COLUMN "hls_playlist_url"`);
    await queryRunner.query(`ALTER TABLE "contenido" DROP COLUMN "video_origen_clave"`);
    await queryRunner.query(`ALTER TABLE "contenido" DROP COLUMN "estado_procesamiento"`);

    await queryRunner.query(`DROP TYPE "public"."estado_procesamiento"`);
  }
}
