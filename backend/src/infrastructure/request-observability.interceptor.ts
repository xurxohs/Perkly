import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class RequestObservabilityInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const response = http.getResponse<FastifyReply>();
    const requestId = String(request.headers['x-request-id'] || randomUUID()).slice(0, 128);
    response.header('x-request-id', requestId);
    const started = Date.now();

    return next.handle().pipe(
      catchError((error: unknown) => {
        const status = this.statusOf(error);
        if (status >= 500) {
          const message = error instanceof Error ? error.message : 'Unknown server error';
          this.logger.error(JSON.stringify({ requestId, method: request.method, path: request.url.split('?')[0], status, message }));
        }
        return throwError(() => error);
      }),
      finalize(() => {
        this.metrics.record(request.method, request.url, response.statusCode, Date.now() - started);
      }),
    );
  }

  private statusOf(error: unknown) {
    if (typeof error === 'object' && error && 'getStatus' in error && typeof error.getStatus === 'function') {
      return Number(error.getStatus()) || 500;
    }
    return 500;
  }
}
