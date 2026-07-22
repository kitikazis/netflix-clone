import 'reflect-metadata';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ConfigType } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { appConfig } from './config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const logger = new Logger('Bootstrap');

  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  // Security headers + CORS. Los orígenes salen de CORS_ORIGINS; en producción
  // son obligatorios (ver env.validation), porque la API responde con
  // credenciales y un comodín permitiría peticiones autenticadas desde
  // cualquier web. `crossOriginResourcePolicy` se relaja para que el HLS
  // servido por esta misma API se pueda reproducir desde el dominio del front.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({ origin: config.corsOrigins, credentials: true });

  // /api/v1/... — URI versioning keeps breaking changes additive.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global input validation: strip unknown props, reject extras, auto-transform payloads.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Consistent response envelope + centralized error shape.
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

  // Graceful shutdown (closes DB pool, Redis connection, queues).
  app.enableShutdownHooks();

  // OpenAPI docs at /docs (non-production convenience; guard behind auth in prod).
  if (!config.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Netflix Clone API')
      .setDescription('Backend API for the Netflix clone practice project')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(config.port);
  logger.log(`API running on http://localhost:${config.port}/api/v1 (env: ${config.env})`);
  if (!config.isProduction) {
    logger.log(`Swagger docs on http://localhost:${config.port}/docs`);
  }
}

void bootstrap();
