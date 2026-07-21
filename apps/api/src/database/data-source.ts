import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

/**
 * Standalone DataSource used exclusively by the TypeORM CLI (migration:generate/run/revert).
 * It runs OUTSIDE the Nest DI container, so it reads env directly via dotenv.
 * The runtime connection lives in DatabaseModule and reuses the same options shape.
 *
 * Globs point at .ts here because the CLI is executed through ts-node.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'netflix',
  password: process.env.DATABASE_PASSWORD ?? 'netflix',
  database: process.env.DATABASE_NAME ?? 'netflix_clone',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  namingStrategy: new SnakeNamingStrategy(),
  // Never auto-sync schema — every change goes through a versioned migration.
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
