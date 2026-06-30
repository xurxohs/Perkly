import { ExecutionContext } from '@nestjs/common';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthRateLimitGuard', () => {
  it('blocks repeated login attempts for the same ip and email', () => {
    const guard = new AuthRateLimitGuard();
    const context = contextFor({
      url: '/auth/login',
      ip: '127.0.0.1',
      headers: {},
      body: { email: 'user@example.com' },
    });

    for (let index = 0; index < 10; index += 1) {
      expect(guard.canActivate(context)).toBe(true);
    }

    expect(() => guard.canActivate(context)).toThrow(
      'Too many auth attempts, please try again later',
    );
  });

  it('tracks different login emails separately', () => {
    const guard = new AuthRateLimitGuard();

    for (let index = 0; index < 10; index += 1) {
      expect(
        guard.canActivate(
          contextFor({
            url: '/auth/login',
            ip: '127.0.0.1',
            headers: {},
            body: { email: 'first@example.com' },
          }),
        ),
      ).toBe(true);
    }

    expect(
      guard.canActivate(
        contextFor({
          url: '/auth/login',
          ip: '127.0.0.1',
          headers: {},
          body: { email: 'second@example.com' },
        }),
      ),
    ).toBe(true);
  });
});
