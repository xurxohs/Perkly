import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { MetricsService } from './metrics.service';
import { RequestObservabilityInterceptor } from './request-observability.interceptor';

describe('RequestObservabilityInterceptor', () => {
  it('passes Telegraf events through without accessing HTTP request data', (done) => {
    const metrics = {
      record: jest.fn(),
    } as unknown as MetricsService;
    const interceptor = new RequestObservabilityInterceptor(metrics);
    const context = {
      getType: jest.fn().mockReturnValue('telegraf'),
      switchToHttp: jest.fn(),
    } as unknown as ExecutionContext;
    const next = {
      handle: jest.fn().mockReturnValue(of('handled')),
    } as unknown as CallHandler;

    interceptor.intercept(context, next).subscribe({
      next: (value) => expect(value).toBe('handled'),
      complete: () => {
        expect(next.handle).toHaveBeenCalledTimes(1);
        expect(context.switchToHttp).not.toHaveBeenCalled();
        expect(metrics.record).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
