import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Esquema inicial del catálogo y las cuentas:
 * usuarios, perfiles, contenido, episodios, generos, progreso_visualizacion
 * y la tabla puente contenido_generos.
 */
export class CrearEsquemaInicial1784633390492 implements MigrationInterface {
    name = 'CrearEsquemaInicial1784633390492'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Necesaria para el DEFAULT uuid_generate_v4() de las PKs uuid.
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "episodios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "contenido_id" uuid NOT NULL, "temporada" smallint NOT NULL, "numero_episodio" smallint NOT NULL, "titulo" character varying(255) NOT NULL, "sinopsis" text, "duracion_minutos" integer, CONSTRAINT "uq_episodio_contenido_temporada_numero" UNIQUE ("contenido_id", "temporada", "numero_episodio"), CONSTRAINT "PK_e4e90564f1a1343fb24edd3618f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_37acc83de332c05d7762abd094" ON "episodios" ("contenido_id") `);
        await queryRunner.query(`CREATE TABLE "generos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nombre" character varying(80) NOT NULL, "slug" character varying(80) NOT NULL, CONSTRAINT "PK_7ebe7a16bcbfd533d6445d74fef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1edd68ea943e15e59220d35063" ON "generos" ("nombre") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6d9928739d66b94862ddce017d" ON "generos" ("slug") `);
        await queryRunner.query(`CREATE TYPE "public"."tipo_contenido" AS ENUM('PELICULA', 'SERIE')`);
        await queryRunner.query(`CREATE TABLE "contenido" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tipo" "public"."tipo_contenido" NOT NULL, "titulo" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "sinopsis" text, "anio_lanzamiento" smallint, "clasificacion_edad" character varying(20), "poster_url" character varying(500), "backdrop_url" character varying(500), "duracion_minutos" integer, "destacado" boolean NOT NULL DEFAULT false, "publicado" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_71c8600ea41d795f27219c36631" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fa729da24096e3c284f8b32795" ON "contenido" ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_ca882d2c2ae84b763d5c776220" ON "contenido" ("destacado") `);
        await queryRunner.query(`CREATE INDEX "IDX_04faf63115eddf36cbc3adf2b9" ON "contenido" ("publicado") `);
        await queryRunner.query(`CREATE TABLE "progreso_visualizacion" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "perfil_id" uuid NOT NULL, "contenido_id" uuid NOT NULL, "episodio_id" uuid, "segundo_actual" integer NOT NULL DEFAULT '0', "duracion_total" integer NOT NULL DEFAULT '0', "completado" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_f660c5f290a3c4a4ef6b9298557" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1894b7860af0368039ca9dbd91" ON "progreso_visualizacion" ("perfil_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_progreso_episodio" ON "progreso_visualizacion" ("perfil_id", "contenido_id", "episodio_id") WHERE episodio_id IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_progreso_pelicula" ON "progreso_visualizacion" ("perfil_id", "contenido_id") WHERE episodio_id IS NULL`);
        await queryRunner.query(`CREATE TABLE "perfiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "usuario_id" uuid NOT NULL, "nombre" character varying(100) NOT NULL, "avatar_url" character varying(500), "es_infantil" boolean NOT NULL DEFAULT false, "idioma" character varying(10) NOT NULL DEFAULT 'es', CONSTRAINT "PK_50d8a0a9bdea75489c5f230ce27" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "usuarios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "correo" character varying(255) NOT NULL, "contrasena_hash" character varying(255) NOT NULL, "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_63665765c1a778a770c9bd585d" ON "usuarios" ("correo") `);
        await queryRunner.query(`CREATE TABLE "contenido_generos" ("contenido_id" uuid NOT NULL, "genero_id" uuid NOT NULL, CONSTRAINT "PK_910249c88f4216b16b2829e8dcd" PRIMARY KEY ("contenido_id", "genero_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_08698d8663a5b65a597442b094" ON "contenido_generos" ("contenido_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_4dde87bc57255cbf98f0d28e43" ON "contenido_generos" ("genero_id") `);
        await queryRunner.query(`ALTER TABLE "episodios" ADD CONSTRAINT "FK_37acc83de332c05d7762abd0945" FOREIGN KEY ("contenido_id") REFERENCES "contenido"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "progreso_visualizacion" ADD CONSTRAINT "FK_1894b7860af0368039ca9dbd912" FOREIGN KEY ("perfil_id") REFERENCES "perfiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "progreso_visualizacion" ADD CONSTRAINT "FK_de29adc5458e4cd046622c00026" FOREIGN KEY ("contenido_id") REFERENCES "contenido"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "progreso_visualizacion" ADD CONSTRAINT "FK_262e84bdc878ac83eb42b90c4f8" FOREIGN KEY ("episodio_id") REFERENCES "episodios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "perfiles" ADD CONSTRAINT "FK_f1ba88813b103ae277538c3fdd8" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contenido_generos" ADD CONSTRAINT "FK_08698d8663a5b65a597442b0945" FOREIGN KEY ("contenido_id") REFERENCES "contenido"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "contenido_generos" ADD CONSTRAINT "FK_4dde87bc57255cbf98f0d28e434" FOREIGN KEY ("genero_id") REFERENCES "generos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contenido_generos" DROP CONSTRAINT "FK_4dde87bc57255cbf98f0d28e434"`);
        await queryRunner.query(`ALTER TABLE "contenido_generos" DROP CONSTRAINT "FK_08698d8663a5b65a597442b0945"`);
        await queryRunner.query(`ALTER TABLE "perfiles" DROP CONSTRAINT "FK_f1ba88813b103ae277538c3fdd8"`);
        await queryRunner.query(`ALTER TABLE "progreso_visualizacion" DROP CONSTRAINT "FK_262e84bdc878ac83eb42b90c4f8"`);
        await queryRunner.query(`ALTER TABLE "progreso_visualizacion" DROP CONSTRAINT "FK_de29adc5458e4cd046622c00026"`);
        await queryRunner.query(`ALTER TABLE "progreso_visualizacion" DROP CONSTRAINT "FK_1894b7860af0368039ca9dbd912"`);
        await queryRunner.query(`ALTER TABLE "episodios" DROP CONSTRAINT "FK_37acc83de332c05d7762abd0945"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4dde87bc57255cbf98f0d28e43"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_08698d8663a5b65a597442b094"`);
        await queryRunner.query(`DROP TABLE "contenido_generos"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_63665765c1a778a770c9bd585d"`);
        await queryRunner.query(`DROP TABLE "usuarios"`);
        await queryRunner.query(`DROP TABLE "perfiles"`);
        await queryRunner.query(`DROP INDEX "public"."uq_progreso_pelicula"`);
        await queryRunner.query(`DROP INDEX "public"."uq_progreso_episodio"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1894b7860af0368039ca9dbd91"`);
        await queryRunner.query(`DROP TABLE "progreso_visualizacion"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_04faf63115eddf36cbc3adf2b9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ca882d2c2ae84b763d5c776220"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa729da24096e3c284f8b32795"`);
        await queryRunner.query(`DROP TABLE "contenido"`);
        await queryRunner.query(`DROP TYPE "public"."tipo_contenido"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6d9928739d66b94862ddce017d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1edd68ea943e15e59220d35063"`);
        await queryRunner.query(`DROP TABLE "generos"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_37acc83de332c05d7762abd094"`);
        await queryRunner.query(`DROP TABLE "episodios"`);
    }

}
