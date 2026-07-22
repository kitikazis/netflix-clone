import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Custom Terminus indicator: Terminus ships a DB indicator but not a Redis one,
 * so we PING the shared connection and report up/down accordingly.
 */
@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      // El tipo de `ping()` es la constante 'PONG', así que cualquier otra cosa
      // queda como `never` y no se puede interpolar: basta con decir que falló.
      const pong: string = await this.redis.ping();
      if (pong !== 'PONG') {
        return indicator.down({ message: `Unexpected PING response: ${pong}` });
      }
      return indicator.up();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Redis error';
      return indicator.down({ message });
    }
  }
}
