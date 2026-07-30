import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { RateLimitService } from '../infrastructure/rate-limit.service';

type PurchaseRequest = {
  ip?: string;
  user?: { userId?: string };
};

@Injectable()
export class PurchaseRateLimitGuard implements CanActivate {
  constructor(private readonly limits: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PurchaseRequest>();
    const actor = request.user?.userId || request.ip || 'unknown';
    const result = await this.limits.consume(`purchase:${actor}`, 5, 60);

    if (result.allowed) return true;

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Слишком много покупок. Повторите попытку позже.',
        retryAfter: result.retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
