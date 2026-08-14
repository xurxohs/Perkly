import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RateLimitService } from '../infrastructure/rate-limit.service';
import { SessionService } from './session.service';
import { TelegramIdentityService } from './telegram-identity.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: TelegramIdentityService, useValue: {} },
        {
          provide: RateLimitService,
          useValue: {
            consume: jest.fn().mockResolvedValue({
              allowed: true,
              retryAfter: 60,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
