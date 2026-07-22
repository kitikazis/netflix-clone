import 'dotenv/config';
import { join } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

/**
 * Standalone DataSource used exclusively by the TypeORM CLI (migration:generate/run/revert).
 * It runs OUTSIDE the Nest DI container, so it reads env directly via dotenv.
 * The runtime connection lives in DatabaseModule and reuses the same options shape.
 */

/**
 * Los globs se derivan de la ubicación de ESTE archivo, no del CWD, para que
 * el mismo data-source sirva en las dos formas de ejecutarlo: bajo ts-node en
 * desarrollo (src/**\/*.ts) y ya compilado en la imagen de producción, que no
 * lleva ts-node (dist/**\/*.js). Con globs fijos a `src/*.ts`, `migration:run`
 * dentro del contenedor no encontraría ni una migración y arrancaría contra un
 * esquema vacío sin quejarse.
 */
const esTypeScript = __filename.endsWith('.ts');
const ext = esTypeScript ? 'ts' : 'js';
const raiz = join(__dirname, '..'); // src/ o dist/

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'netflix',
  password: process.env.DATABASE_PASSWORD ?? 'netflix',
  database: process.env.DATABASE_NAME ?? 'netflix_clone',
  // Mismo criterio que DatabaseModule: sin esto, `migration:run` contra un
  // Postgres gestionado (Supabase, Neon…) ni siquiera llega a conectar.
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [join(raiz, '**', `*.entity.${ext}`)],
  migrations: [join(raiz, 'database', 'migrations', `*.${ext}`)],
  namingStrategy: new SnakeNamingStrategy(),
  // Never auto-sync schema — every change goes through a versioned migration.
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
