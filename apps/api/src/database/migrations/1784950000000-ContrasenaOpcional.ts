import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La contraseña deja de ser obligatoria.
 *
 * Una cuenta creada al entrar con Google no tiene contraseña y nunca la tendrá:
 * la identidad la respalda Google. La alternativa era guardar un hash inventado,
 * pero eso deja en la base algo que parece una credencial válida y con la que
 * nadie podrá iniciar sesión jamás; mejor que el hueco se vea.
 *
 * Las cuentas que ya existen no se tocan: quitar la obligatoriedad no borra
 * nada, así que la migración es segura de aplicar en caliente.
 */
export class ContrasenaOpcional1784950000000 implements MigrationInterface {
  name = 'ContrasenaOpcional1784950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" ALTER COLUMN "contrasena_hash" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir exige que no queden cuentas sin contraseña, o Postgres se niega.
    await queryRunner.query(`DELETE FROM "usuarios" WHERE "contrasena_hash" IS NULL`);
    await queryRunner.query(`ALTER TABLE "usuarios" ALTER COLUMN "contrasena_hash" SET NOT NULL`);
  }
}
