import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: {
    chatRoom: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    message: {
      groupBy: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      chatRoom: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      message: {
        groupBy: jest.fn(),
      },
    };

    service = new ChatService(
      prisma as unknown as PrismaService,
      {} as NotificationsService,
    );
  });

  it('paginates rooms and counts unread messages only for the current page', async () => {
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    prisma.chatRoom.findMany.mockResolvedValue([
      {
        id: 'room-1',
        type: 'DIRECT',
        transaction: null,
        participants: [],
        messages: [],
        updatedAt,
      },
    ]);
    prisma.chatRoom.count.mockResolvedValue(150);
    prisma.message.groupBy.mockResolvedValue([
      { roomId: 'room-1', _count: { _all: 3 } },
    ]);

    const result = await service.getRooms('user-1', 'ADMIN', -10, 100000);

    expect(prisma.chatRoom.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
        orderBy: { updatedAt: 'desc' },
      }),
    );
    expect(prisma.message.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          roomId: { in: ['room-1'] },
        }),
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0].unreadCount).toBe(3);
    expect(result.total).toBe(150);
    expect(result.pagination).toEqual({
      skip: 0,
      take: 100,
      total: 150,
      hasMore: true,
      nextSkip: 1,
    });
  });
});
