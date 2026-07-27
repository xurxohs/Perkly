import type { ExecutionContext } from '@nestjs/common';
import { GlobalRateLimitGuard } from './global-rate-limit.guard';

describe('GlobalRateLimitGuard', () => {
  const limits = {
    consume: jest.fn().mockResolvedValue({ allowed: true, retryAfter: 0 }),
  };
  const guard = new GlobalRateLimitGuard(limits as never);

  beforeEach(() => {
    limits.consume.mockClear();
  });

  it('skips non-HTTP contexts such as Telegram updates', async () => {
    const context = {
      getType: () => 'telegraf',
      switchToHttp: () => {
        throw new Error('HTTP context must not be read');
      },
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(limits.consume).not.toHaveBeenCalled();
  });

  it('still rate limits HTTP requests', async () => {
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/offers?limit=16',
          method: 'GET',
          ip: '127.0.0.1',
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(limits.consume).toHaveBeenCalledWith(
      '127.0.0.1:GET:/offers',
      300,
      60,
    );
  });
});
