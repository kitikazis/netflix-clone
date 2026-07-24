import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Canonical, typed description of every environment variable the API depends on.
 * `validate()` runs once at bootstrap; a missing/invalid var aborts startup
 * instead of surfacing as a runtime error deep inside a request.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number = 3000;

  /**
   * Orígenes permitidos por CORS, separados por comas.
   * Obligatoria en producción: la API responde con credenciales, así que un
   * comodín ahí deja que cualquier web haga peticiones autenticadas en nombre
   * del usuario. En desarrollo se permite cualquier origen por comodidad.
   */
  @ValidateIf((o: EnvironmentVariables) => o.NODE_ENV === NodeEnv.Production)
  @IsString()
  @MinLength(1)
  CORS_ORIGINS?: string;

  // --- PostgreSQL ---
  @IsString()
  DATABASE_HOST!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(65535)
  DATABASE_PORT!: number;

  @IsString()
  DATABASE_USER!: string;

  @IsString()
  DATABASE_PASSWORD!: string;

  @IsString()
  DATABASE_NAME!: string;

  /** 'true' para conectar por TLS. Obligatorio en Postgres gestionados. */
  @IsOptional()
  @IsIn(['true', 'false'])
  DATABASE_SSL?: string;

  // --- Redis ---
  @IsString()
  REDIS_HOST!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(65535)
  REDIS_PORT!: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  /** 'true' para conectar por TLS. Necesario si Redis no está en tu red. */
  @IsOptional()
  @IsIn(['true', 'false'])
  REDIS_TLS?: string;

  // --- JWT (consumed from Phase 3; validated now so the config surface is complete) ---
  @IsString()
  @MinLength(16)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(16)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_ACCESS_TTL = '15m';

  @IsString()
  JWT_REFRESH_TTL = '7d';

  // --- Media / pipeline de vídeo (Fase 5; todas opcionales con defaults) ---
  @IsOptional()
  @IsString()
  MEDIA_SOURCE_DIR?: string;

  @IsOptional()
  @IsString()
  MEDIA_OUTPUT_DIR?: string;

  @IsOptional()
  @IsString()
  MEDIA_WORK_DIR?: string;

  @IsOptional()
  @IsString()
  MEDIA_PUBLIC_PATH?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  MEDIA_TRANSCODE_CONCURRENCY?: number;

  // --- Almacenamiento de objetos (Fase 6; R2_* solo requeridas si driver = r2) ---
  @IsOptional()
  @IsIn(['local', 'r2'])
  STORAGE_DRIVER?: string;

  /**
   * Endpoint S3 explícito. Si se define, el driver deja de derivar la URL de
   * R2 y apunta a cualquier proveedor compatible (Supabase Storage, B2, MinIO).
   */
  @IsOptional()
  @IsString()
  S3_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  S3_REGION?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  S3_FORCE_PATH_STYLE?: string;

  @IsOptional()
  @IsString()
  R2_ACCOUNT_ID?: string;

  @IsOptional()
  @IsString()
  R2_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  R2_SECRET_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  R2_BUCKET?: string;

  @IsOptional()
  @IsString()
  R2_PUBLIC_BASE_URL?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(3600)
  R2_PRESIGN_EXPIRES?: number;

  // ---- Entrar por WhatsApp (Meta Cloud API). Todo opcional: sin token ni
  // phoneId, el envío queda en modo desarrollo (código al log). ----
  @IsOptional()
  @IsString()
  WHATSAPP_TOKEN?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_PHONE_ID?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_TEMPLATE?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_LANG?: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    const details = errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('\n  - ');
    throw new Error(`Environment validation failed:\n  - ${details}`);
  }

  return validated;
}
