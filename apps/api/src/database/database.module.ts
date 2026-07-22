import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { appConfig, databaseConfig } from '@/config';

/**
 * Runtime DB connection. Entities are auto-discovered per feature module via
 * `TypeOrmModule.forFeature([...])` + `autoLoadEntities: true`, so no central
 * entity registry is needed. Migrations are applied through the CLI, never at boot.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [databaseConfig.KEY, appConfig.KEY],
      useFactory: (
        db: ConfigType<typeof databaseConfig>,
        app: ConfigType<typeof appConfig>,
      ) => ({
        type: 'postgres',
        host: db.host,
        port: db.port,
        username: db.user,
        password: db.password,
        database: db.name,
        ssl: db.ssl ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        namingStrategy: new SnakeNamingStrategy(),
        logging: app.isProduction ? ['error', 'warn'] : ['error', 'warn', 'schema'],
      }),
    }),
  ],
})
export class DatabaseModule {}
