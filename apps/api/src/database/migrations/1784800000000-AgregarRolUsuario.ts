import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 4 (autorización): añade el rol de cuenta (USUARIO/ADMIN) para poder
 * restringir la mutación del catálogo a administradores.
 */
export class AgregarRolUsuario1784800000000 implements MigrationInterface {
  name = 'AgregarRolUsuario1784800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."rol_usuario" AS ENUM('USUARIO', 'ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "rol" "public"."rol_usuario" NOT NULL DEFAULT 'USUARIO'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "rol"`);
    await queryRunner.query(`DROP TYPE "public"."rol_usuario"`);
  }
}
