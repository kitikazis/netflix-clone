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

/**
 * Pipeline de vídeo (Fase 5). Rutas de almacenamiento local para el origen, la
 * salida HLS servida estáticamente y el directorio de trabajo temporal.
 * En la Fase 6, `sourceDir`/`outputDir` se sustituyen por Cloudflare R2.
 */
export const mediaConfig = registerAs('media', () => ({
  sourceDir: process.env.MEDIA_SOURCE_DIR ?? 'storage/source',
  outputDir: process.env.MEDIA_OUTPUT_DIR ?? 'storage/hls',
  workDir: process.env.MEDIA_WORK_DIR ?? 'storage/tmp',
  // Ruta bajo la que se sirve `outputDir` (ServeStaticModule) y prefijo de hlsPlaylistUrl.
  publicPath: process.env.MEDIA_PUBLIC_PATH ?? '/media',
  transcodeConcurrency: parseInt(process.env.MEDIA_TRANSCODE_CONCURRENCY ?? '1', 10),
}));

/**
 * Almacenamiento de objetos (Fase 6). `driver` elige la implementación de
 * `Almacenamiento`: `local` (disco, por defecto en dev) o `r2` (Cloudflare R2 vía
 * API S3). Las credenciales R2 solo se exigen cuando `driver = r2`.
 */
export const storageConfig = registerAs('storage', () => ({
  driver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 'r2',
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    // URL pública del bucket (r2.dev o dominio propio) para servir el HLS.
    publicBaseUrl: (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/+$/, ''),
    presignExpiresSeconds: parseInt(process.env.R2_PRESIGN_EXPIRES ?? '900', 10),
  },
}));

export const configurations = [
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  mediaConfig,
  storageConfig,
];
