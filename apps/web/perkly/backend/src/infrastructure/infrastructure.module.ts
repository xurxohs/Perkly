import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { GlobalRateLimitGuard } from './global-rate-limit.guard';
import { HealthController } from './health.controller';
import { RateLimitService } from './rate-limit.service';
import { MetricsService } from './metrics.service';
import { RequestObservabilityInterceptor } from './request-observability.interceptor';
import { ProductionConfigService } from './production-config.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [
    RateLimitService,
    MetricsService,
    ProductionConfigService,
    { provide: APP_GUARD, useClass: GlobalRateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestObservabilityInterceptor },
  ],
  exports: [RateLimitService, MetricsService],
})
export class InfrastructureModule {}
