import { Test, TestingModule } from '@nestjs/testing';
import { getBotToken } from 'nestjs-telegraf';
import { AuthService } from '../auth/auth.service';
import { OffersService } from '../offers/offers.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { BotService } from './bot.service';

describe('BotService', () => {
  let service: BotService;
  let prisma: { user: { findUnique: jest.Mock; upsert: jest.Mock; update: jest.Mock } };
  let authService: {
    claimLoginToken: jest.Mock;
    resolveClaimedLogin: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    authService = {
      claimLoginToken: jest.fn(),
      resolveClaimedLogin: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: authService },
        { provide: TransactionsService, useValue: {} },
        { provide: OffersService, useValue: {} },
        {
          provide: getBotToken(),
          useValue: { telegram: { sendMessage: jest.fn() } },
        },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not create a user before a login token is confirmed', async () => {
    authService.claimLoginToken.mockResolvedValue({
      session: { flow: 'link' },
    });
    const ctx = {
      from: { id: 123, first_name: 'Shoxrux' },
      message: { text: '/start login_token-1' },
      reply: jest.fn(),
    };

    await service.start(ctx as never);

    expect(authService.claimLoginToken).toHaveBeenCalledWith('token-1', '123');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('подключения'),
      expect.any(Object),
    );
  });
});
