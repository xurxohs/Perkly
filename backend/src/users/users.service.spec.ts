import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { UsersService } from './users.service';
import { StorageService } from '../storage/storage.service';

describe('UsersService blocking', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
    };
    userBlock: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      userBlock: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new UsersService(
      prisma as unknown as PrismaService,
      {} as EntitlementsService,
      {} as StorageService,
    );
  });

  it('rejects self-blocking before touching the database', async () => {
    await expect(service.blockUser('user-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.userBlock.upsert).not.toHaveBeenCalled();
  });

  it('rejects a non-integer subscription duration as a bad request', async () => {
    await expect(service.subscribe('user-1', 'GOLD', 1.5)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('does not create blocks for missing or soft-deleted users', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'user-2',
      deletedAt: new Date('2026-07-16T00:00:00.000Z'),
    });

    await expect(service.blockUser('user-1', 'user-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.blockUser('user-1', 'user-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.userBlock.upsert).not.toHaveBeenCalled();
  });

  it('creates blocks idempotently and only removes the caller-owned block', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      deletedAt: null,
    });
    prisma.userBlock.upsert.mockResolvedValue({
      id: 'block-1',
      blockerId: 'user-1',
      blockedId: 'user-2',
    });
    prisma.userBlock.deleteMany.mockResolvedValue({ count: 1 });

    await service.blockUser('user-1', 'user-2');
    await expect(service.unblockUser('user-1', 'user-2')).resolves.toEqual({
      success: true,
      removed: true,
    });

    expect(prisma.userBlock.upsert).toHaveBeenCalledWith({
      where: {
        blockerId_blockedId: {
          blockerId: 'user-1',
          blockedId: 'user-2',
        },
      },
      update: {},
      create: { blockerId: 'user-1', blockedId: 'user-2' },
    });
    expect(prisma.userBlock.deleteMany).toHaveBeenCalledWith({
      where: { blockerId: 'user-1', blockedId: 'user-2' },
    });
  });

  it('omits soft-deleted accounts from the blocked users list', async () => {
    prisma.userBlock.findMany.mockResolvedValue([]);

    await service.listBlockedUsers('user-1');

    expect(prisma.userBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          blockerId: 'user-1',
          blocked: { deletedAt: null },
        },
      }),
    );
  });
});
