import { BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionStatus } from '../common/enums';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: {
    offer: { findUnique: jest.Mock; updateMany: jest.Mock };
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    promocodeActivation: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
    transaction: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    financialEntry: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let notificationsService: { sendPushNotification: jest.Mock };

  const offer = {
    id: 'offer-1',
    title: 'Coffee deal',
    price: 100,
    companyId: 'company-1',
    isActive: true,
    moderationStatus: 'APPROVED',
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
      offer: {
        id: 'offer-1',
        isActive: true,
        moderationStatus: 'APPROVED',
      },
    },
  };

  beforeEach(() => {
    prisma = {
      offer: { findUnique: jest.fn(), updateMany: jest.fn() },
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      promocodeActivation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      financialEntry: { create: jest.fn() },
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
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUniqueOrThrow.mockResolvedValue({ balance: 420 });
    prisma.transaction.create.mockResolvedValue(createdTransaction);
    prisma.financialEntry.create.mockResolvedValue({ id: 'entry-1' });
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
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'buyer-1', balance: { gte: 80 } },
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
    expect(prisma.financialEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'buyer-1',
        transactionId: 'tx-1',
        type: 'PURCHASE_DEBIT',
        amount: -80,
        balanceAfter: 420,
      }),
    });
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

  it('requires buyer data before reserving or charging an offer', async () => {
    prisma.offer.findUnique.mockResolvedValue({
      ...offer,
      buyerInputRequired: true,
      buyerInputPrompt: 'Telegram @username',
    });

    await expect(service.purchase('buyer-1', 'offer-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('never charges a demo offer', async () => {
    prisma.offer.findUnique.mockResolvedValue({ ...offer, isDemo: true });

    await expect(service.purchase('buyer-1', 'offer-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns the original purchase for a repeated idempotency key', async () => {
    const existing = {
      id: 'tx-existing',
      offerId: 'offer-1',
      buyerId: 'buyer-1',
      price: 100,
      status: TransactionStatus.ESCROW,
      offer,
    };
    prisma.transaction.findUnique.mockResolvedValue(existing);

    await expect(
      service.purchase('buyer-1', 'offer-1', false, 0, undefined, 'request-1'),
    ).resolves.toEqual(existing);
    expect(prisma.offer.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('releases escrow exactly once through a conditional state transition', async () => {
    const escrow = {
      id: 'tx-1',
      buyerId: 'buyer-1',
      price: 10000,
      status: TransactionStatus.ESCROW,
      offer: { ...offer, sellerId: 'seller-1' },
    };
    const completed = {
      ...escrow,
      status: TransactionStatus.COMPLETED,
      buyer: { id: 'buyer-1', squadId: null },
    };
    prisma.transaction.findUnique.mockResolvedValue(escrow);
    prisma.transaction.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({ balance: 109500 });
    prisma.transaction.findUniqueOrThrow.mockResolvedValue(completed);
    prisma.financialEntry.create.mockResolvedValue({ id: 'entry-1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'seller-1' });
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    notificationsService.sendPushNotification.mockResolvedValue(undefined);

    await expect(service.confirmDelivery('tx-1', 'buyer-1')).resolves.toEqual(completed);
    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'tx-1', status: TransactionStatus.ESCROW },
      data: { status: TransactionStatus.COMPLETED },
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { balance: { increment: 9500 } } }),
    );
  });

  it('does not pay the seller when another request already released escrow', async () => {
    prisma.transaction.findUnique.mockResolvedValue({
      id: 'tx-1',
      buyerId: 'buyer-1',
      price: 10000,
      status: TransactionStatus.ESCROW,
      offer,
    });
    prisma.transaction.updateMany.mockResolvedValue({ count: 0 });
    prisma.$transaction.mockImplementation((callback) => callback(prisma));

    await expect(service.confirmDelivery('tx-1', 'buyer-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.financialEntry.create).not.toHaveBeenCalled();
  });
});
