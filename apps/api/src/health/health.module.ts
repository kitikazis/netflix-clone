import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisHealthIndicator } from '@/redis/redis.health';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  // Terminus provides HealthIndicatorService here; the Redis client comes from
  // the global RedisModule, so the indicator resolves cleanly in this context.
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
