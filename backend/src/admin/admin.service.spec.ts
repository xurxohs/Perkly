import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminService', () => {
  const offerUpdate = jest.fn();
  const adminLogCreate = jest.fn();
  const transactionFindUnique = jest.fn();
  const disputeFindUnique = jest.fn();
  const transactionRunner = jest.fn();

  const prisma = {
    offer: { update: offerUpdate },
    adminLog: { create: adminLogCreate },
    transaction: { findUnique: transactionFindUnique },
    dispute: { findUnique: disputeFindUnique },
    $transaction: transactionRunner,
  } as unknown as PrismaService;

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
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
