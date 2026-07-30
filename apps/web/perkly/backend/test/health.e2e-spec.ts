import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { HealthController } from '../src/infrastructure/health.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { RateLimitService } from '../src/infrastructure/rate-limit.service';

describe('Health API (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn().mockResolvedValue([1]) },
        },
        {
          provide: RateLimitService,
          useValue: {
            status: jest
              .fn()
              .mockResolvedValue({ configured: true, ready: true }),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  it('reports liveness without dependency details', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'perkly-backend',
    });
  });

  it('reports readiness when database and Redis are available', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ready',
      checks: { database: true, redis: { ready: true } },
    });
  });

  it('does not expose detailed process or route metrics publicly', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/metrics',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
