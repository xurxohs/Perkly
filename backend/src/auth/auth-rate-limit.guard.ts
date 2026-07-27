import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { RateLimitService } from '../infrastructure/rate-limit.service';

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
  constructor(private readonly limits: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RateLimitedRequest>();
    const rule = this.ruleFor(request);
    const key = `${rule.name}:${rule.key(request)}`;
    const result = await this.limits.consume(
      key,
      rule.limit,
      Math.ceil(rule.windowMs / 1_000),
    );
    if (result.allowed) {
      return true;
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many auth attempts, please try again later',
        retryAfter: result.retryAfter,
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

    if (path.includes('/password/forgot')) {
      return {
        name: 'password-forgot',
        limit: 5,
        windowMs: 60 * 60_000,
        key: (req) => `${this.clientIp(req)}:${this.bodyValue(req, 'email')}`,
      };
    }

    if (path.includes('/password/reset')) {
      return {
        name: 'password-reset',
        limit: 10,
        windowMs: 15 * 60_000,
        key: (req) => `${this.clientIp(req)}:${this.bodyValue(req, 'email')}`,
      };
    }

    if (path.includes('/apple')) {
      return {
        name: 'apple-auth',
        limit: 15,
        windowMs: 15 * 60_000,
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
}
