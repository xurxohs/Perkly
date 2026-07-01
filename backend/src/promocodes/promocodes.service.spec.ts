import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PromocodesService } from './promocodes.service';

describe('PromocodesService', () => {
  let prisma: {
    company: {
      findUnique: jest.Mock;
    };
    offer: {
      findUnique: jest.Mock;
    };
    promocode: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    promocodeActivation: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: PromocodesService;

  const activeCompany = {
    id: 'company-1',
    ownerUserId: 'seller-1',
    status: 'ACTIVE',
  };

  beforeEach(() => {
    prisma = {
      company: {
        findUnique: jest.fn(),
      },
      offer: {
        findUnique: jest.fn(),
      },
      promocode: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      promocodeActivation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new PromocodesService(prisma as never);
  });

  it('creates a static promocode for the active owner company', async () => {
    prisma.company.findUnique.mockResolvedValue(activeCompany);
    prisma.offer.findUnique.mockResolvedValue({
      id: 'offer-1',
      companyId: 'company-1',
    });
    prisma.promocode.create.mockResolvedValue({ id: 'promo-1' });

    await expect(
      service.create('seller-1', 'VENDOR', {
        title: ' Launch ',
        description: '  Opening discount ',
        code: ' launch 10 ',
        discountValue: '10',
        offerId: 'offer-1',
      }),
    ).resolves.toEqual({ id: 'promo-1' });

    expect(prisma.promocode.create).toHaveBeenCalledWith({
      data: {
        company: { connect: { id: 'company-1' } },
        offer: { connect: { id: 'offer-1' } },
        title: 'Launch',
        description: 'Opening discount',
        codeType: 'STATIC',
        code: 'LAUNCH10',
        discountValue: 10,
        maxActivations: undefined,
        perUserLimit: 1,
        validFrom: undefined,
        validTo: undefined,
        status: 'ACTIVE',
      },
    });
  });

  it('rejects promocode creation without an active company', async () => {
    prisma.company.findUnique.mockResolvedValue({
      ...activeCompany,
      status: 'PENDING_MODERATION',
    });

    await expect(
      service.create('seller-1', 'VENDOR', {
        title: 'Launch',
        code: 'LAUNCH10',
        discountValue: 10,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.promocode.create).not.toHaveBeenCalled();
  });

  it('rejects invalid discount, date range and foreign offer', async () => {
    prisma.company.findUnique.mockResolvedValue(activeCompany);

    await expect(
      service.create('seller-1', 'VENDOR', {
        title: 'Launch',
        code: 'LAUNCH10',
        discountValue: 101,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create('seller-1', 'VENDOR', {
        title: 'Launch',
        code: 'LAUNCH10',
        discountValue: 10,
        validFrom: '2026-02-02T00:00:00.000Z',
        validTo: '2026-02-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.offer.findUnique.mockResolvedValue({
      id: 'offer-1',
      companyId: 'other-company',
    });

    await expect(
      service.create('seller-1', 'VENDOR', {
        title: 'Launch',
        code: 'LAUNCH10',
        discountValue: 10,
        offerId: 'offer-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an admin to create for a selected active company', async () => {
    prisma.company.findUnique.mockResolvedValue(activeCompany);
    prisma.promocode.create.mockResolvedValue({ id: 'promo-1' });

    await service.create('admin-1', 'ADMIN', {
      companyId: 'company-1',
      title: 'Dynamic',
      codeType: 'DYNAMIC',
      discountValue: 15,
    });

    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: 'company-1' },
    });
    expect(prisma.promocode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          codeType: 'DYNAMIC',
          code: null,
        }),
      }),
    );
  });

  it('updates only owned promocodes', async () => {
    prisma.promocode.findUnique.mockResolvedValue({
      id: 'promo-1',
      companyId: 'company-1',
      codeType: 'STATIC',
      validFrom: null,
      validTo: null,
      company: { ownerUserId: 'seller-1' },
    });
    prisma.promocode.update.mockResolvedValue({ id: 'promo-1' });

    await service.update('seller-1', 'VENDOR', 'promo-1', {
      title: 'Updated',
      status: 'PAUSED',
    });

    expect(prisma.promocode.update).toHaveBeenCalledWith({
      where: { id: 'promo-1' },
      data: {
        title: 'Updated',
        status: 'PAUSED',
      },
    });

    prisma.promocode.findUnique.mockResolvedValueOnce({
      id: 'promo-2',
      companyId: 'company-2',
      company: { ownerUserId: 'other-seller' },
    });

    await expect(
      service.update('seller-1', 'VENDOR', 'promo-2', { title: 'Nope' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('clears static code when switching a promocode to dynamic', async () => {
    prisma.promocode.findUnique.mockResolvedValue({
      id: 'promo-1',
      companyId: 'company-1',
      codeType: 'STATIC',
      code: 'LAUNCH10',
      validFrom: null,
      validTo: null,
      company: { ownerUserId: 'seller-1' },
    });
    prisma.promocode.update.mockResolvedValue({ id: 'promo-1' });

    await service.update('seller-1', 'VENDOR', 'promo-1', {
      codeType: 'DYNAMIC',
    });

    expect(prisma.promocode.update).toHaveBeenCalledWith({
      where: { id: 'promo-1' },
      data: {
        codeType: 'DYNAMIC',
        code: null,
      },
    });
  });

  it('activates an active promocode and returns existing open activation', async () => {
    const validTo = new Date(Date.now() + 86400_000);
    prisma.promocode.findUnique.mockResolvedValue({
      id: 'promo-1',
      offerId: 'offer-1',
      codeType: 'STATIC',
      code: 'LAUNCH10',
      status: 'ACTIVE',
      validFrom: null,
      validTo,
      maxActivations: null,
      perUserLimit: 1,
      offer: { id: 'offer-1', isActive: true },
    });
    prisma.promocodeActivation.findFirst.mockResolvedValueOnce(null);
    prisma.promocodeActivation.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.promocodeActivation.create.mockResolvedValue({
      id: 'activation-1',
      codeSnapshot: 'LAUNCH10',
    });

    await expect(service.activate('user-1', 'promo-1')).resolves.toEqual({
      id: 'activation-1',
      codeSnapshot: 'LAUNCH10',
    });

    expect(prisma.promocodeActivation.create).toHaveBeenCalledWith({
      data: {
        user: { connect: { id: 'user-1' } },
        promocode: { connect: { id: 'promo-1' } },
        offer: { connect: { id: 'offer-1' } },
        status: 'ISSUED',
        codeSnapshot: 'LAUNCH10',
        expiresAt: validTo,
      },
      select: expect.any(Object),
    });

    prisma.promocodeActivation.findFirst.mockResolvedValueOnce({
      id: 'activation-1',
      status: 'ISSUED',
    });
    prisma.promocodeActivation.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    await expect(service.activate('user-1', 'promo-1')).resolves.toEqual({
      id: 'activation-1',
      status: 'ISSUED',
    });
  });

  it('rejects promocode activation when user or total limits are reached', async () => {
    prisma.promocode.findUnique.mockResolvedValue({
      id: 'promo-1',
      offerId: null,
      codeType: 'STATIC',
      code: 'LIMIT10',
      status: 'ACTIVE',
      validFrom: null,
      validTo: null,
      maxActivations: 2,
      perUserLimit: 1,
      offer: null,
    });
    prisma.promocodeActivation.findFirst.mockResolvedValue(null);
    prisma.promocodeActivation.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    await expect(service.activate('user-1', 'promo-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prisma.promocodeActivation.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);

    await expect(service.activate('user-2', 'promo-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prisma.promocodeActivation.create).not.toHaveBeenCalled();
  });

  it('rejects inactive, expired or already used activations', async () => {
    prisma.promocode.findUnique.mockResolvedValueOnce(null);
    await expect(service.activate('user-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.promocode.findUnique.mockResolvedValueOnce({
      id: 'promo-1',
      codeType: 'STATIC',
      status: 'PAUSED',
      validFrom: null,
      validTo: null,
      offer: null,
    });
    await expect(service.activate('user-1', 'promo-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prisma.promocodeActivation.findUnique.mockResolvedValue({
      id: 'activation-1',
      userId: 'user-1',
      status: 'USED',
      expiresAt: null,
    });

    await expect(
      service.copyActivation('user-1', 'activation-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('copies and uses owned activations only', async () => {
    prisma.promocodeActivation.findUnique.mockResolvedValue({
      id: 'activation-1',
      userId: 'user-1',
      status: 'ISSUED',
      expiresAt: null,
    });
    prisma.promocodeActivation.update.mockResolvedValue({
      id: 'activation-1',
      status: 'COPIED',
    });

    await expect(
      service.copyActivation('user-1', 'activation-1'),
    ).resolves.toEqual({
      id: 'activation-1',
      status: 'COPIED',
    });

    expect(prisma.promocodeActivation.update).toHaveBeenCalledWith({
      where: { id: 'activation-1' },
      data: {
        status: 'COPIED',
        copiedAt: expect.any(Date),
      },
      select: expect.any(Object),
    });

    prisma.promocodeActivation.findUnique.mockResolvedValueOnce({
      id: 'activation-2',
      userId: 'other-user',
      status: 'ISSUED',
      expiresAt: null,
    });

    await expect(
      service.useActivation('user-1', 'activation-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
