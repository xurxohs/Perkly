import { EntitlementsService } from '../entitlements/entitlements.service';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { HomeService } from './home.service';

describe('HomeService unread chats', () => {
  it('does not count hidden direct rooms involving blocked users', async () => {
    const prisma = {
      userBlock: {
        findMany: jest.fn().mockResolvedValue([
          { blockerId: 'user-1', blockedId: 'user-2' },
          { blockerId: 'user-3', blockedId: 'user-1' },
        ]),
      },
      chatRoom: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      message: {
        groupBy: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    const service = new HomeService(
      prisma as unknown as PrismaService,
      {} as EntitlementsService,
      {} as EventsService,
    );

    await expect(
      (
        service as unknown as {
          loadUnreadChats: (userId: string) => Promise<unknown>;
        }
      ).loadUnreadChats('user-1'),
    ).resolves.toEqual({
      rooms: 0,
      totalUnread: 0,
      latestRoomId: null,
    });

    const where = prisma.chatRoom.findMany.mock.calls[0][0].where;
    expect(where.AND[1].OR[1]).toEqual({
      participants: {
        none: {
          id: { in: ['user-2', 'user-3'] },
        },
      },
    });
    expect(prisma.message.groupBy).not.toHaveBeenCalled();
    expect(prisma.message.findFirst).not.toHaveBeenCalled();
  });
});
