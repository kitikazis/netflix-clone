import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Entrar por número de WhatsApp.
 *
 * Una cuenta puede nacer ahora de un teléfono en vez de un correo, así que el
 * correo pasa a ser opcional y aparece el teléfono, también único. El código de
 * un solo uso no se guarda aquí: vive en Redis con caducidad, que es una nota
 * de usar y tirar y no tiene sitio en una tabla.
 *
 * Las cuentas que ya existen no cambian: siguen con su correo y sin teléfono.
 */
export class AccesoWhatsApp1785000000000 implements MigrationInterface {
  name = 'AccesoWhatsApp1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."proveedor_registro" ADD VALUE IF NOT EXISTS 'WHATSAPP'`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" ALTER COLUMN "correo" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "usuarios" ADD "telefono" character varying(20)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_usuarios_telefono" ON "usuarios" ("telefono") WHERE "telefono" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usuarios_telefono"`);
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "telefono"`);
    // El correo vuelve a ser obligatorio solo si no quedan cuentas sin él.
    await queryRunner.query(`DELETE FROM "usuarios" WHERE "correo" IS NULL`);
    await queryRunner.query(`ALTER TABLE "usuarios" ALTER COLUMN "correo" SET NOT NULL`);
    // El valor del enum no se puede quitar en Postgres; se deja, es inocuo.
  }
}
