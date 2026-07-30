import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly redis?: Redis;
  private readonly fallback = new Map<string, { count: number; resetAt: number }>();

  constructor() {
    const url = process.env.REDIS_URL?.trim();
    if (url) {
      this.redis = new Redis(url, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 2_000,
      });
      this.redis.on('error', (error) => {
        this.logger.warn(`Redis rate limit unavailable: ${error.message}`);
      });
    }
  }

  async consume(key: string, limit: number, windowSeconds: number) {
    if (this.redis) {
      try {
        if (this.redis.status === 'wait') await this.redis.connect();
        const redisKey = `perkly:rate:${key}`;
        const count = await this.redis.incr(redisKey);
        if (count === 1) await this.redis.expire(redisKey, windowSeconds);
        const ttl = await this.redis.ttl(redisKey);
        return { allowed: count <= limit, retryAfter: Math.max(1, ttl) };
      } catch {
        // A bounded in-process fallback keeps one-instance development usable.
      }
    }

    const now = Date.now();
    const current = this.fallback.get(key);
    if (!current || current.resetAt <= now) {
      this.fallback.set(key, {
        count: 1,
        resetAt: now + windowSeconds * 1_000,
      });
      this.cleanup(now);
      return { allowed: true, retryAfter: windowSeconds };
    }
    current.count += 1;
    return {
      allowed: current.count <= limit,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  async status() {
    if (!this.redis) {
      return {
        configured: false,
        ready: process.env.NODE_ENV !== 'production',
      };
    }
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      return { configured: true, ready: (await this.redis.ping()) === 'PONG' };
    } catch {
      return { configured: true, ready: false };
    }
  }

  async onModuleDestroy() {
    if (this.redis && this.redis.status !== 'end') await this.redis.quit();
  }

  private cleanup(now: number) {
    if (this.fallback.size < 5_000) return;
    for (const [key, value] of this.fallback) {
      if (value.resetAt <= now) this.fallback.delete(key);
    }
  }
}
