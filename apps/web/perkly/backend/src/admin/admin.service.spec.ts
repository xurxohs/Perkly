import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminService', () => {
  const offerUpdate = jest.fn();
  const offerFindUnique = jest.fn();
  const adminLogCreate = jest.fn();
  const transactionFindUnique = jest.fn();
  const disputeFindUnique = jest.fn();
  const transactionRunner = jest.fn();

  const prisma = {
    offer: { update: offerUpdate, findUnique: offerFindUnique },
    adminLog: { create: adminLogCreate },
    transaction: { findUnique: transactionFindUnique },
    dispute: { findUnique: disputeFindUnique },
    $transaction: transactionRunner,
  } as unknown as PrismaService;

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    offerFindUnique.mockResolvedValue({ moderationStatus: 'APPROVED' });
    transactionRunner.mockImplementation(
      async (callback: (client: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    service = new AdminService(prisma);
  });

  it('updates all supported offer fields and records the admin action', async () => {
    const updated = { id: 'offer-1', title: 'Кофе' };
    offerUpdate.mockResolvedValue(updated);
    adminLogCreate.mockResolvedValue({ id: 'log-1' });

    await expect(
      service.updateOffer(
        'offer-1',
        {
          title: '  Кофе  ',
          description: '  Промокод на кофе  ',
          price: 50_000,
          discountPercent: 25,
          category: 'restaurants',
          isActive: true,
        },
        'admin-1',
      ),
    ).resolves.toEqual(updated);

    expect(offerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'offer-1' },
        data: {
          title: 'Кофе',
          description: 'Промокод на кофе',
          price: 50_000,
          discountPercent: 25,
          category: 'RESTAURANTS',
          isActive: true,
        },
      }),
    );
    expect(adminLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: 'admin-1',
        action: 'UPDATE_OFFER',
        targetId: 'offer-1',
      }),
    });
  });

  it('rejects fractional UZS prices from the admin editor', async () => {
    await expect(
      service.updateOffer('offer-1', { price: 50_000.5 }, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(offerUpdate).not.toHaveBeenCalled();
  });

  it('does not activate an offer before moderation approval', async () => {
    offerFindUnique.mockResolvedValue({ moderationStatus: 'PENDING' });

    await expect(
      service.updateOffer('offer-1', { isActive: true }, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(offerUpdate).not.toHaveBeenCalled();
  });

  it('approves and publishes an offer while recording the moderator', async () => {
    const approved = { id: 'offer-1', moderationStatus: 'APPROVED' };
    offerUpdate.mockResolvedValue(approved);
    adminLogCreate.mockResolvedValue({ id: 'log-1' });

    await expect(
      service.moderateOffer(
        'offer-1',
        { status: 'approved', note: '  Проверено  ' },
        'admin-1',
      ),
    ).resolves.toEqual(approved);

    expect(offerUpdate).toHaveBeenCalledWith({
      where: { id: 'offer-1' },
      data: {
        moderationStatus: 'APPROVED',
        moderationNote: 'Проверено',
        moderationAt: expect.any(Date),
        moderationBy: 'admin-1',
        isActive: true,
      },
      select: expect.any(Object),
    });
    expect(adminLogCreate).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        action: 'APPROVE_OFFER',
        targetId: 'offer-1',
        details: JSON.stringify({
          status: 'APPROVED',
          note: 'Проверено',
        }),
      },
    });
  });

  it('requires a reason when rejecting an offer', async () => {
    await expect(
      service.moderateOffer(
        'offer-1',
        { status: 'REJECTED', note: '   ' },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(offerUpdate).not.toHaveBeenCalled();
    expect(adminLogCreate).not.toHaveBeenCalled();
  });

  it('rejects and unpublishes an offer with the moderator note', async () => {
    offerUpdate.mockResolvedValue({
      id: 'offer-1',
      moderationStatus: 'REJECTED',
    });
    adminLogCreate.mockResolvedValue({ id: 'log-1' });

    await service.moderateOffer(
      'offer-1',
      { status: 'REJECTED', note: 'Нарушает правила площадки' },
      'admin-1',
    );

    expect(offerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moderationStatus: 'REJECTED',
          moderationNote: 'Нарушает правила площадки',
          moderationBy: 'admin-1',
          isActive: false,
        }),
      }),
    );
    expect(adminLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'REJECT_OFFER' }),
    });
  });

  it('refunds an escrow transaction exactly once and writes the ledger', async () => {
    transactionFindUnique.mockResolvedValue({
      id: 'tx-1',
      buyerId: 'buyer-1',
      price: 75_000,
      status: 'ESCROW',
      offer: { sellerId: 'seller-1' },
    });

    const tx = {
      transaction: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ balance: 175_000 }),
        update: jest.fn(),
      },
      financialEntry: {
        create: jest.fn().mockResolvedValue({ id: 'entry-1' }),
      },
      adminLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };
    transactionRunner.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );

    await expect(
      service.refundTransaction('tx-1', 'admin-1'),
    ).resolves.toEqual({ message: 'Refund successful' });

    expect(tx.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'tx-1',
        status: { in: ['COMPLETED', 'PAID', 'ESCROW', 'DISPUTED'] },
      },
      data: { status: 'REFUNDED' },
    });
    expect(tx.financialEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'ADMIN_REFUND',
        amount: 75_000,
        balanceAfter: 175_000,
        idempotencyKey: 'admin-refund:tx-1',
      }),
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('persists the admin note when resolving a dispute for the buyer', async () => {
    disputeFindUnique
      .mockResolvedValueOnce({
        id: 'dispute-1',
        status: 'OPEN',
        transaction: {
          id: 'tx-1',
          buyerId: 'buyer-1',
          offerId: 'offer-1',
          price: 60_000,
          status: 'DISPUTED',
        },
      })
      .mockResolvedValueOnce({ id: 'dispute-1', status: 'RESOLVED' });

    const tx = {
      dispute: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      transaction: {
        update: jest.fn().mockResolvedValue({ id: 'tx-1' }),
      },
      user: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ balance: 160_000 }),
      },
      financialEntry: {
        create: jest.fn().mockResolvedValue({ id: 'entry-1' }),
      },
      adminLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
      offer: {
        findUnique: jest.fn(),
      },
    };
    transactionRunner.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );

    await service.resolveDispute(
      'dispute-1',
      'BUYER',
      'admin-1',
      '  Товар не был предоставлен  ',
    );

    expect(tx.dispute.updateMany).toHaveBeenCalledWith({
      where: { id: 'dispute-1', status: 'OPEN' },
      data: expect.objectContaining({
        status: 'RESOLVED',
        resolution: 'BUYER',
        adminNote: 'Товар не был предоставлен',
        resolvedBy: 'admin-1',
      }),
    });
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { id: 'tx-1' },
      data: { status: 'REFUNDED' },
    });
  });
});
