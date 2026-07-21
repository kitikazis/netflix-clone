import { registerAs } from '@nestjs/config';

/**
 * Namespaced, typed config slices. Consume them with:
 *   constructor(@Inject(databaseConfig.KEY) private db: ConfigType<typeof databaseConfig>) {}
 * which gives full type inference without stringly-typed `configService.get('...')` calls.
 *
 * Env is already validated & coerced by `validate()`, so parsing here is safe.
 */

export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  isProduction: process.env.NODE_ENV === 'production',
}));

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DATABASE_HOST as string,
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  user: process.env.DATABASE_USER as string,
  password: process.env.DATABASE_PASSWORD as string,
  name: process.env.DATABASE_NAME as string,
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST as string,
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET as string,
  refreshSecret: process.env.JWT_REFRESH_SECRET as string,
  accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
}));

export const configurations = [appConfig, databaseConfig, redisConfig, jwtConfig];
