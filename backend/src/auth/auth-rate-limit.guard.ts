import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitRule = {
  name: string;
  limit: number;
  windowMs: number;
  key: (request: RateLimitedRequest) => string;
};

type RateLimitedRequest = {
  ip?: string;
  url?: string;
  originalUrl?: string;
  routerPath?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private lastCleanupAt = 0;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RateLimitedRequest>();
    const rule = this.ruleFor(request);
    const now = Date.now();
    this.cleanup(now);

    const key = `${rule.name}:${rule.key(request)}`;
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
      return true;
    }

    bucket.count += 1;
    if (bucket.count <= rule.limit) {
      return true;
    }

    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many auth attempts, please try again later',
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private ruleFor(request: RateLimitedRequest): RateLimitRule {
    const path = request.url || request.originalUrl || request.routerPath || '';

    if (path.includes('/telegram-poll')) {
      return {
        name: 'telegram-poll',
        limit: 60,
        windowMs: 60_000,
        key: (req) => `${this.clientIp(req)}:${this.queryValue(req, 'token')}`,
      };
    }

    if (path.includes('/telegram-init')) {
      return {
        name: 'telegram-init',
        limit: 10,
        windowMs: 60_000,
        key: (req) => this.clientIp(req),
      };
    }

    if (path.includes('/register')) {
      return {
        name: 'register',
        limit: 5,
        windowMs: 60 * 60_000,
        key: (req) => this.clientIp(req),
      };
    }

    if (path.includes('/login')) {
      return {
        name: 'login',
        limit: 10,
        windowMs: 15 * 60_000,
        key: (req) => `${this.clientIp(req)}:${this.bodyValue(req, 'email')}`,
      };
    }

    return {
      name: 'telegram-auth',
      limit: 20,
      windowMs: 5 * 60_000,
      key: (req) => this.clientIp(req),
    };
  }

  private clientIp(request: RateLimitedRequest) {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const raw =
      Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || request.ip;
    return String(raw || 'unknown').split(',')[0].trim();
  }

  private bodyValue(request: RateLimitedRequest, key: string) {
    const value = request.body?.[key];
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
  }

  private queryValue(request: RateLimitedRequest, key: string) {
    const value = request.query?.[key];
    return typeof value === 'string' ? value.trim() : '';
  }

  private cleanup(now: number) {
    if (now - this.lastCleanupAt < 60_000) return;
    this.lastCleanupAt = now;

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
