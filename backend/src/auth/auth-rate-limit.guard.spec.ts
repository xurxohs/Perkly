import { ExecutionContext } from '@nestjs/common';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { RateLimitService } from '../infrastructure/rate-limit.service';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthRateLimitGuard', () => {
  it('blocks repeated login attempts for the same ip and email', async () => {
    const guard = new AuthRateLimitGuard(new RateLimitService());
    const context = contextFor({
      url: '/auth/login',
      ip: '127.0.0.1',
      headers: {},
      body: { email: 'user@example.com' },
    });

    for (let index = 0; index < 10; index += 1) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Too many auth attempts, please try again later',
    );
  });

  it('tracks different login emails separately', async () => {
    const guard = new AuthRateLimitGuard(new RateLimitService());

    for (let index = 0; index < 10; index += 1) {
      await expect(
        guard.canActivate(
          contextFor({
            url: '/auth/login',
            ip: '127.0.0.1',
            headers: {},
            body: { email: 'first@example.com' },
          }),
        ),
      ).resolves.toBe(true);
    }

    await expect(
      guard.canActivate(
        contextFor({
          url: '/auth/login',
          ip: '127.0.0.1',
          headers: {},
          body: { email: 'second@example.com' },
        }),
      ),
    ).resolves.toBe(true);
  });
});
