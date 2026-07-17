import { Injectable } from '@nestjs/common';

type RouteMetric = {
  requests: number;
  errors: number;
  totalDurationMs: number;
  maxDurationMs: number;
};

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly routes = new Map<string, RouteMetric>();

  record(method: string, route: string, status: number, durationMs: number) {
    const key = `${method} ${this.normalizeRoute(route)}`;
    if (!this.routes.has(key) && this.routes.size >= 500) return;
    const metric = this.routes.get(key) || {
      requests: 0,
      errors: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
    };
    metric.requests += 1;
    if (status >= 500) metric.errors += 1;
    metric.totalDurationMs += durationMs;
    metric.maxDurationMs = Math.max(metric.maxDurationMs, durationMs);
    this.routes.set(key, metric);
  }

  snapshot() {
    return {
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      memory: process.memoryUsage(),
      routes: Array.from(this.routes.entries()).map(([route, value]) => ({
        route,
        requests: value.requests,
        errors: value.errors,
        averageDurationMs: Math.round(value.totalDurationMs / value.requests),
        maxDurationMs: value.maxDurationMs,
      })),
    };
  }

  private normalizeRoute(url: string) {
    return url
      .split('?')[0]
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
      .replace(/\/\d+(?=\/|$)/g, '/:id');
  }
}
