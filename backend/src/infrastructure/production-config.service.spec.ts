import { ProductionConfigService } from './production-config.service';

const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:password@database:5432/perkly',
  REDIS_URL: 'rediss://user:password@redis.example.com:6379',
  JWT_SECRET: 'a-secure-secret-that-is-longer-than-32-characters',
  TELEGRAM_BOT_TOKEN: 'telegram-token',
  FRONTEND_URL: 'https://perkly.uz',
  PUBLIC_API_URL: 'https://api.perkly.uz',
  CORS_ORIGINS: 'https://perkly.uz,https://www.perkly.uz',
  CLICK_SECRET_KEY: 'click-secret',
  CLICK_MERCHANT_ID: 'merchant',
  CLICK_SERVICE_ID: 'service',
  STORAGE_DRIVER: 's3',
  S3_BUCKET: 'perkly',
  S3_REGION: 'auto',
  S3_ACCESS_KEY_ID: 'access',
  S3_SECRET_ACCESS_KEY: 'secret',
  S3_PUBLIC_BASE_URL: 'https://cdn.perkly.uz',
};

describe('ProductionConfigService', () => {
  const service = new ProductionConfigService();

  it('accepts a complete production environment', () => {
    expect(() => service.validate(validEnvironment)).not.toThrow();
  });

  it('rejects unsafe production defaults and missing payment configuration', () => {
    expect(() =>
      service.validate({
        ...validEnvironment,
        JWT_SECRET: 'short',
        CLICK_SECRET_KEY: '',
        CORS_ORIGINS: 'https://perkly.uz,http://localhost:3000',
      }),
    ).toThrow(/JWT_SECRET must contain at least 32 characters/);
  });
});
