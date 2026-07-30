import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: {
    event: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    topkaPost: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    prisma = {
      event: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      topkaPost: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    service = new EventsService(prisma as unknown as PrismaService);
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        updated_at: '2026-01-01T00:00:00.000Z',
        events: [
          {
            id: 'parser-1',
            title: 'Live concert',
            description: 'Concert night',
            date: '2026-01-10',
            venue: 'Topka',
          },
        ],
      }),
    } as unknown as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('enforces event moderation in the service layer', async () => {
    await expect(
      service.createVendorEvent('organizer-1', {
        title: 'Clean event',
        description: 'Clean description',
        fullDescription: 'f.u.c.k',
        category: 'Концерт',
        date: new Date('2026-08-01T18:00:00.000Z'),
        startTime: '18:00',
        ageLimit: '18+',
        location: 'Tashkent',
        address: 'Tashkent',
        imageUrl: 'https://example.com/event.jpg',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.update({
        where: { id: 'event-1' },
        data: { description: { set: 'n@zi gathering' } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.event.create).not.toHaveBeenCalled();
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('limits event source queries before merging', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(5);
    prisma.topkaPost.findMany.mockResolvedValue([]);
    prisma.topkaPost.count.mockResolvedValue(2);

    const result = await service.findAll({
      skip: -10,
      take: 100000,
      where: {
        category: 'Концерт',
        OR: [{ title: { contains: 'concert' } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
      }),
    );
    expect(prisma.topkaPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(8);
  });

  it('uses a source window before applying global pagination', async () => {
    prisma.event.findMany.mockResolvedValue([
      {
        id: 'db-1',
        title: 'DB first',
        category: 'Концерт',
        description: 'DB first',
        fullDescription: null,
        date: new Date('2026-01-10T00:00:00.000Z'),
        startTime: '20:00',
        ageLimit: '0+',
        location: 'Venue',
        address: 'Venue',
        latitude: null,
        longitude: null,
        imageUrl: '',
        viewersCount: 0,
        participantsCount: 0,
        organizerId: 'org',
        createdAt: new Date('2026-01-05T00:00:00.000Z'),
        updatedAt: new Date('2026-01-05T00:00:00.000Z'),
      },
      {
        id: 'db-2',
        title: 'DB second',
        category: 'Концерт',
        description: 'DB second',
        fullDescription: null,
        date: new Date('2026-01-11T00:00:00.000Z'),
        startTime: '20:00',
        ageLimit: '0+',
        location: 'Venue',
        address: 'Venue',
        latitude: null,
        longitude: null,
        imageUrl: '',
        viewersCount: 0,
        participantsCount: 0,
        organizerId: 'org',
        createdAt: new Date('2026-01-04T00:00:00.000Z'),
        updatedAt: new Date('2026-01-04T00:00:00.000Z'),
      },
    ]);
    prisma.event.count.mockResolvedValue(2);
    prisma.topkaPost.findMany.mockResolvedValue([]);
    prisma.topkaPost.count.mockResolvedValue(0);
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        updated_at: '2026-01-01T00:00:00.000Z',
        events: [],
      }),
    } as unknown as Response);

    const result = await service.findAll({
      skip: 1,
      take: 1,
      orderBy: { createdAt: 'desc' },
    });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 2,
      }),
    );
    expect(prisma.topkaPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 2,
      }),
    );
    expect(result.data.map((event) => event.id)).toEqual(['db-2']);
    expect(result.total).toBe(2);
  });
});
