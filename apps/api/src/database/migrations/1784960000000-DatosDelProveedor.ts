import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Guarda de dónde salió cada cuenta, con el nombre y la foto del proveedor.
 *
 * Hasta ahora una cuenta era solo un correo, y en el panel no había forma de
 * distinguir a quien se registró con contraseña de quien entró con Google.
 *
 * Las cuentas que ya existen quedan como LOCAL, que es lo que son: se crearon
 * con correo y contraseña, porque hasta hoy no había otra manera.
 */
export class DatosDelProveedor1784960000000 implements MigrationInterface {
  name = 'DatosDelProveedor1784960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."proveedor_registro" AS ENUM('LOCAL', 'GOOGLE')`);
    await queryRunner.query(`ALTER TABLE "usuarios" ADD "nombre" character varying(120)`);
    await queryRunner.query(`ALTER TABLE "usuarios" ADD "foto_url" character varying(500)`);
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "proveedor" "public"."proveedor_registro" NOT NULL DEFAULT 'LOCAL'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "proveedor"`);
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "foto_url"`);
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "nombre"`);
    await queryRunner.query(`DROP TYPE "public"."proveedor_registro"`);
  }
}
