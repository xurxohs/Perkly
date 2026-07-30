import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from '../auth/roles.guard';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { TransactionStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SellerController } from './seller.controller';

describe('SellerController', () => {
  let controller: SellerController;
  const prisma = {
    transaction: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    offer: { count: jest.fn() },
    event: { aggregate: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SellerController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: EntitlementsService, useValue: {} },
        { provide: RolesGuard, useValue: { canActivate: jest.fn(() => true) } },
      ],
    }).compile();

    controller = module.get<SellerController>(SellerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns seller earnings after the platform fee', async () => {
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { price: 100_000 } });
    prisma.transaction.count.mockResolvedValue(3);
    prisma.offer.count.mockResolvedValue(2);
    prisma.event.aggregate.mockResolvedValue({
      _count: { id: 1 },
      _sum: { viewersCount: 40, participantsCount: 7 },
    });
    prisma.transaction.findMany.mockResolvedValue([]);

    await expect(
      controller.getStats({ user: { userId: 'seller-1' } }),
    ).resolves.toEqual(
      expect.objectContaining({
        totalEarnings: 95_000,
        completedVolume: 100_000,
        totalSales: 3,
        activeOffers: 2,
      }),
    );
  });

  it('filters transactions and clamps pagination', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);

    await controller.getMyTransactions(
      { user: { userId: 'seller-1' } },
      '-10',
      '1000',
      TransactionStatus.COMPLETED,
    );

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
        where: { offer: { sellerId: 'seller-1' }, status: 'COMPLETED' },
      }),
    );
  });
});
