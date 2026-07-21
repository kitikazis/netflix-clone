import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { redisConfig } from '@/config';
import { REDIS_CLIENT } from './redis.constants';

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [redisConfig.KEY],
  useFactory: (config: ConfigType<typeof redisConfig>): Redis => {
    const logger = new Logger('RedisModule');
    const client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      // Fail fast if Redis is unreachable rather than buffering commands forever.
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });

    client.on('connect', () => logger.log(`Connected to Redis at ${config.host}:${config.port}`));
    client.on('error', (err) => logger.error(`Redis error: ${err.message}`));

    return client;
  },
};

/**
 * Global so any feature module (sessions, cache, BullMQ helpers, watch-progress)
 * can inject the same connection with `@Inject(REDIS_CLIENT)` without re-importing.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
