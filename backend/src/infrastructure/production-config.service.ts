import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class ProductionConfigService implements OnModuleInit {
  private readonly logger = new Logger(ProductionConfigService.name);

  onModuleInit() {
    if (process.env.NODE_ENV !== 'production') return;
    this.validate(process.env);
  }

  validate(env: NodeJS.ProcessEnv) {
    const errors: string[] = [];
    const required = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'TELEGRAM_BOT_TOKEN',
      'FRONTEND_URL',
      'PUBLIC_API_URL',
      'CORS_ORIGINS',
    ] as const;

    for (const key of required) {
      if (!env[key]?.trim()) errors.push(`${key} is required`);
    }
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must contain at least 32 characters');
    }
    if (env.DATABASE_URL && !env.DATABASE_URL.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must use PostgreSQL');
    }
    if (env.REDIS_URL && !/^rediss?:\/\//.test(env.REDIS_URL)) {
      errors.push('REDIS_URL must use redis:// or rediss://');
    }
    for (const key of ['FRONTEND_URL', 'PUBLIC_API_URL'] as const) {
      if (env[key] && !env[key]!.startsWith('https://')) {
        errors.push(`${key} must use HTTPS`);
      }
    }
    if (
      env.CORS_ORIGINS &&
      /localhost|127\.0\.0\.1/i.test(env.CORS_ORIGINS)
    ) {
      errors.push('CORS_ORIGINS must not include localhost in production');
    }

    const clickKeys = [
      'CLICK_SECRET_KEY',
      'CLICK_MERCHANT_ID',
      'CLICK_SERVICE_ID',
    ] as const;
    const configuredClickKeys = clickKeys.filter((key) => env[key]?.trim());
    if (configuredClickKeys.length > 0 && configuredClickKeys.length < clickKeys.length) {
      errors.push('Click merchant configuration must be complete');
    } else if (configuredClickKeys.length === 0) {
      this.logger.warn(
        'Click merchant is not configured; production top-ups will be disabled',
      );
    }

    const storageDriver = (env.STORAGE_DRIVER || 'local').toLowerCase();
    if (!['local', 's3'].includes(storageDriver)) {
      errors.push('STORAGE_DRIVER must be local or s3');
    }
    if (storageDriver === 's3') {
      for (const key of [
        'S3_BUCKET',
        'S3_REGION',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
        'S3_PUBLIC_BASE_URL',
      ] as const) {
        if (!env[key]?.trim()) errors.push(`${key} is required for S3 storage`);
      }
      if (
        env.S3_PUBLIC_BASE_URL &&
        !env.S3_PUBLIC_BASE_URL.startsWith('https://')
      ) {
        errors.push('S3_PUBLIC_BASE_URL must use HTTPS');
      }
    } else {
      this.logger.warn(
        'STORAGE_DRIVER=local: production uploads require a persistent mounted volume',
      );
    }

    if (!env.APNS_KEY_ID || !env.APNS_TEAM_ID || !env.APNS_KEY_PATH) {
      this.logger.warn(
        'APNs is not fully configured; iOS push notifications will be disabled',
      );
    }

    if (errors.length > 0) {
      throw new Error(
        `Invalid production configuration:\n- ${errors.join('\n- ')}`,
      );
    }
  }
}
