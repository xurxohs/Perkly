import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitService } from './rate-limit.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limits: RateLimitService,
  ) {}

  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'perkly-backend',
      version: process.env.APP_VERSION || process.env.GIT_SHA || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready() {
    const checks = { database: false, redis: await this.limits.status() };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      // Report a generic state and never expose connection details.
    }
    if (!checks.database || !checks.redis.ready) {
      throw new ServiceUnavailableException({ status: 'not_ready', checks });
    }
    return { status: 'ready', checks };
  }

  @Get('metrics')
  metricsStatus() {
    // Detailed process memory, route names and traffic counters are internal
    // operational data. The public health surface exposes no such details.
    return { status: 'ok' };
  }
}
