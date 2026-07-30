import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: {
    trackEvent: jest.Mock;
    getEvents: jest.Mock;
  };
  let jwtService: {
    verify: jest.Mock;
  };

  beforeEach(async () => {
    analyticsService = {
      trackEvent: jest.fn(),
      getEvents: jest.fn(),
    };
    jwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn() } },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('tracks events with a verified JWT user id', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1' });
    analyticsService.trackEvent.mockResolvedValue({ id: 'event-1' });

    await expect(
      controller.trackEvent(
        {
          eventType: 'offer_view',
          offerId: 'offer-1',
          metadata: '{"source":"home"}',
        },
        'session-1',
        'granted',
        'Bearer valid-token',
      ),
    ).resolves.toEqual({ id: 'event-1' });

    expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
    expect(analyticsService.trackEvent).toHaveBeenCalledWith({
      eventType: 'offer_view',
      userId: 'user-1',
      sessionId: 'session-1',
      offerId: 'offer-1',
      metadata: '{"source":"home"}',
    });
  });

  it('tracks events anonymously when JWT verification fails', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });
    analyticsService.trackEvent.mockResolvedValue({ id: 'event-1' });

    await controller.trackEvent(
      { eventType: 'offer_view' },
      'session-1',
      'granted',
      'Bearer fake-token',
    );

    expect(analyticsService.trackEvent).toHaveBeenCalledWith({
      eventType: 'offer_view',
      userId: undefined,
      sessionId: 'session-1',
      offerId: undefined,
      metadata: undefined,
    });
  });

  it('rejects analytics events when consent was not granted', async () => {
    await expect(
      controller.trackEvent(
        { eventType: 'offer_view' },
        'session-1',
        undefined,
        'Bearer valid-token',
      ),
    ).rejects.toMatchObject({ status: 403 });

    expect(analyticsService.trackEvent).not.toHaveBeenCalled();
  });

  it('returns analytics events with normalized pagination', async () => {
    analyticsService.getEvents.mockResolvedValue({ data: [], total: 0 });

    await expect(
      controller.getEvents(
        { user: { role: 'ADMIN' } },
        'offer_view',
        'user-1',
        '10',
        '25',
      ),
    ).resolves.toEqual({ data: [], total: 0 });

    expect(analyticsService.getEvents).toHaveBeenCalledWith({
      eventType: 'offer_view',
      userId: 'user-1',
      skip: 10,
      take: 25,
    });
  });
});
