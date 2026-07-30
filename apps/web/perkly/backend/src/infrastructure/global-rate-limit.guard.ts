import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class GlobalRateLimitGuard implements CanActivate {
  constructor(private readonly limits: RateLimitService) {}

  async canActivate(context: ExecutionContext) {
    // Global HTTP guards are also invoked for Telegraf update handlers by
    // Nest. Those contexts do not contain a Fastify request and must be left
    // to the bot-specific validation/rate limiting.
    if (context.getType<string>() !== 'http') return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request?.url || !request.method || !request.ip) return true;
    const path = request.url.split('?')[0];
    if (path.startsWith('/health/')) return true;

    const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const limit = isMutation ? 120 : 300;
    const key = `${request.ip}:${request.method}:${path}`;
    const result = await this.limits.consume(key, limit, 60);
    if (!result.allowed) {
      throw new HttpException(
        { message: 'Too many requests', retryAfter: result.retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
