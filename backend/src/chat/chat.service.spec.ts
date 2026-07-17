import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: {
    chatRoom: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    message: {
      groupBy: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    userBlock: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      chatRoom: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      message: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      userBlock: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    prisma.userBlock.findMany.mockResolvedValue([]);

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

  it('prevents direct rooms when either user has blocked the other', async () => {
    prisma.userBlock.findFirst.mockResolvedValue({ id: 'block-1' });

    await expect(
      service.createOrGetDirectRoom('user-1', 'user-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.chatRoom.findMany).not.toHaveBeenCalled();
  });

  it('filters direct rooms for blocks created in either direction', async () => {
    prisma.userBlock.findMany.mockResolvedValue([
      { blockerId: 'user-1', blockedId: 'user-2' },
      { blockerId: 'user-3', blockedId: 'user-1' },
    ]);
    prisma.chatRoom.findMany.mockResolvedValue([]);
    prisma.chatRoom.count.mockResolvedValue(0);

    await service.getRooms('user-1');

    const where = prisma.chatRoom.findMany.mock.calls[0][0].where;
    expect(where.AND[1].OR[1]).toEqual({
      participants: {
        none: {
          id: { in: ['user-2', 'user-3'] },
        },
      },
    });
  });

  it('blocks access to an existing direct room in either direction', async () => {
    prisma.chatRoom.findUnique.mockResolvedValue({
      id: 'room-1',
      type: 'DIRECT',
      participants: [{ id: 'user-1' }, { id: 'user-2' }],
      transaction: null,
    });
    prisma.user.findUnique.mockResolvedValue({ role: 'USER' });
    prisma.userBlock.findFirst.mockResolvedValue({ id: 'block-1' });

    await expect(
      service.getMessages('room-1', 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.userBlock.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { blockerId: 'user-1', blockedId: 'user-2' },
          { blockerId: 'user-2', blockedId: 'user-1' },
        ],
      },
      select: { id: true },
    });
    expect(prisma.message.findMany).not.toHaveBeenCalled();
  });

  it('keeps dispute rooms accessible when participants block each other', async () => {
    prisma.chatRoom.findUnique.mockResolvedValue({
      id: 'room-1',
      type: 'DISPUTE',
      participants: [{ id: 'user-1' }, { id: 'user-2' }],
      transaction: null,
    });
    prisma.user.findUnique.mockResolvedValue({ role: 'USER' });
    prisma.message.findMany.mockResolvedValue([]);
    prisma.message.count.mockResolvedValue(0);

    await expect(
      service.getMessages('room-1', 'user-1'),
    ).resolves.toMatchObject({
      data: [],
      room: { id: 'room-1', roomType: 'DISPUTE' },
    });

    expect(prisma.userBlock.findFirst).not.toHaveBeenCalled();
  });

  it('checks a direct-room block only once when sending a message', async () => {
    prisma.chatRoom.findUnique
      .mockResolvedValueOnce({
        id: 'room-1',
        type: 'DIRECT',
        participants: [{ id: 'user-1' }, { id: 'user-2' }],
        transaction: null,
      })
      .mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValue({ role: 'USER' });
    prisma.userBlock.findFirst.mockResolvedValue(null);
    prisma.message.create.mockResolvedValue({
      id: 'message-1',
      content: 'Hello',
      sender: { displayName: 'User' },
    });
    prisma.chatRoom.update.mockResolvedValue({ id: 'room-1' });

    await expect(
      service.sendMessage('room-1', 'user-1', 'Hello'),
    ).resolves.toMatchObject({ id: 'message-1' });

    expect(prisma.userBlock.findFirst).toHaveBeenCalledTimes(1);
  });

  it('rejects objectionable direct messages before writing to the database', async () => {
    await expect(
      service.sendMessage('room-1', 'user-1', 'f.u.c.k spam'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});
