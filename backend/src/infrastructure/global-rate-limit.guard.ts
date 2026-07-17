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
    const request = context.switchToHttp().getRequest<FastifyRequest>();
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
