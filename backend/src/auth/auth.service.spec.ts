import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TelegramLoginStore } from './telegram-login-store.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock; upsert: jest.Mock };
  };
  let jwt: { sign: jest.Mock };
  let telegramStore: {
    get: jest.Mock;
    complete: jest.Mock;
    create: jest.Mock;
    claim: jest.Mock;
    tokenForTelegram: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
    };
    jwt = { sign: jest.fn() };
    telegramStore = {
      get: jest.fn(),
      complete: jest.fn(),
      create: jest.fn(),
      claim: jest.fn(),
      tokenForTelegram: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: AnalyticsService, useValue: {} },
        { provide: NotificationsService, useValue: { sendPushNotification: jest.fn() } },
        { provide: TelegramLoginStore, useValue: telegramStore },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('links Telegram without replacing the existing profile name', async () => {
    telegramStore.get.mockResolvedValue({
      flow: 'link',
      status: 'pending',
      createdAt: Date.now(),
      userId: 'user-1',
      telegramId: 'tg-1',
      device: {},
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      displayName: 'Сохранённое имя',
      role: 'USER',
      tier: 'SILVER',
    });

    await expect(
      service.resolveLoginToken('token-1', 'tg-1', '+998901234567', 'Telegram Name'),
    ).resolves.toMatchObject({ ok: true, flow: 'link' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { telegramId: 'tg-1', phone: '+998901234567' },
    });
    expect(jwt.sign).not.toHaveBeenCalled();
    expect(telegramStore.complete).toHaveBeenCalledWith(
      'token-1',
      expect.objectContaining({ status: 'resolved', jwt: undefined }),
    );
  });

  it('rejects binding a Telegram account owned by another profile', async () => {
    telegramStore.get.mockResolvedValue({
      flow: 'link',
      status: 'pending',
      createdAt: Date.now(),
      userId: 'user-1',
      telegramId: 'tg-1',
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });

    await expect(
      service.resolveLoginToken('token-1', 'tg-1', '+998901234567', 'Name'),
    ).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining('другому профилю'),
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(telegramStore.complete).toHaveBeenCalledWith(
      'token-1',
      expect.objectContaining({ status: 'error' }),
    );
  });
});
