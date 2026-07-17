import { EventsController } from './events.controller';
import { BadRequestException } from '@nestjs/common';

describe('EventsController', () => {
  it('drops protected counters and organizer relations from event updates', async () => {
    const eventsService = {
      update: jest.fn().mockResolvedValue({ id: 'event-1' }),
    };
    const controller = new EventsController(
      eventsService as never,
      {} as never,
    );

    await controller.update(
      { user: { userId: 'admin-1', role: 'ADMIN' } } as never,
      'event-1',
      {
        title: 'Updated event',
        organizerId: 'other-user',
        viewersCount: 999999,
        participantsCount: 999999,
      },
    );

    expect(eventsService.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { title: 'Updated event' },
    });
  });

  it('moderates full event descriptions on create', async () => {
    const eventsService = {
      createVendorEvent: jest.fn(),
    };
    const entitlements = {
      canPublishTopka: jest.fn().mockResolvedValue(true),
    };
    const controller = new EventsController(
      eventsService as never,
      entitlements as never,
    );

    await expect(
      controller.createVendorEvent({ user: { userId: 'user-1' } } as never, {
        title: 'Clean event',
        description: 'Clean description',
        fullDescription: 'б л я д ь',
        date: '2026-08-01T18:00:00.000Z',
        location: 'Tashkent',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(eventsService.createVendorEvent).not.toHaveBeenCalled();
  });
});
