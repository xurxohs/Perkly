import { BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionStatus } from '../common/enums';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: {
    offer: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock; update: jest.Mock };
    promocodeActivation: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
    transaction: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let notificationsService: { sendPushNotification: jest.Mock };

  const offer = {
    id: 'offer-1',
    title: 'Coffee deal',
    price: 100,
    companyId: 'company-1',
    isActive: true,
    sellerId: 'seller-1',
    hiddenData: 'secret',
    periodDays: 0,
  };

  const buyer = {
    id: 'buyer-1',
    balance: 500,
    rewardPoints: 0,
    hasSquadReward: false,
  };

  const activation = {
    id: 'activation-1',
    userId: 'buyer-1',
    promocodeId: 'promo-1',
    offerId: 'offer-1',
    status: 'ISSUED',
    codeSnapshot: 'COFFEE20',
    copiedAt: null,
    usedAt: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    promocode: {
      id: 'promo-1',
      companyId: 'company-1',
      offerId: 'offer-1',
      title: 'Coffee 20',
      description: null,
      codeType: 'STATIC',
      code: 'COFFEE20',
      discountValue: 20,
      validFrom: null,
      validTo: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      offer: { id: 'offer-1', isActive: true },
    },
  };

  beforeEach(() => {
    prisma = {
      offer: { findUnique: jest.fn() },
      user: { findUnique: jest.fn(), update: jest.fn() },
      promocodeActivation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      transaction: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    notificationsService = { sendPushNotification: jest.fn() };

    service = new TransactionsService(
      prisma as never,
      notificationsService as never,
      { checkAndTriggerRewards: jest.fn() } as never,
    );
  });

  it('applies a database promocode activation during purchase', async () => {
    const createdTransaction = {
      id: 'tx-1',
      offerId: 'offer-1',
      buyerId: 'buyer-1',
      price: 80,
      status: TransactionStatus.ESCROW,
      giftCode: null,
      offer,
    };

    prisma.offer.findUnique.mockResolvedValue(offer);
    prisma.user.findUnique
      .mockResolvedValueOnce(buyer)
      .mockResolvedValueOnce({ id: 'seller-1' });
    prisma.promocodeActivation.findUnique.mockResolvedValue(activation);
    prisma.promocodeActivation.updateMany.mockResolvedValue({ count: 1 });
    prisma.transaction.create.mockResolvedValue(createdTransaction);
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    notificationsService.sendPushNotification.mockResolvedValue(undefined);

    await expect(
      service.purchase('buyer-1', 'offer-1', false, 0, 'activation-1'),
    ).resolves.toEqual(createdTransaction);

    expect(prisma.promocodeActivation.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'activation-1',
        userId: 'buyer-1',
        status: { in: ['ISSUED', 'COPIED'] },
      },
      data: {
        status: 'USED',
        usedAt: expect.any(Date),
      },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'buyer-1' },
      data: { balance: { decrement: 80 } },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          offerId: 'offer-1',
          buyerId: 'buyer-1',
          price: 80,
          promocodeActivationId: 'activation-1',
          promocodeDiscount: 20,
          promocodeCodeSnapshot: 'COFFEE20',
        }),
      }),
    );
  });

  it('rejects an activation that is not valid for the purchased offer', async () => {
    prisma.offer.findUnique.mockResolvedValue({ ...offer, id: 'offer-2' });
    prisma.user.findUnique.mockResolvedValue(buyer);
    prisma.promocodeActivation.findUnique.mockResolvedValue(activation);

    await expect(
      service.purchase('buyer-1', 'offer-2', false, 0, 'activation-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
