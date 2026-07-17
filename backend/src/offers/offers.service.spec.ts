import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OffersService } from './offers.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

describe('OffersService', () => {
  let service: OffersService;
  let prisma: {
    offer: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    savedOffer: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    company: {
      findUnique: jest.Mock;
    };
    user: {
      updateMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    financialEntry: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      offer: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      savedOffer: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
      user: {
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      financialEntry: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((callback) => callback(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: { put: jest.fn() } },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not select hiddenData for public offer lists', async () => {
    prisma.offer.findMany.mockResolvedValue([
      {
        id: 'offer-1',
        title: 'Public offer',
        featuredUntil: null,
        seller: { id: 'seller-1', displayName: 'Seller', avatarUrl: null },
      },
    ]);
    prisma.offer.count.mockResolvedValue(1);

    const result = await service.findAllFiltered({});

    expect(prisma.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ hiddenData: true }),
      }),
    );
    expect(result.data[0]).not.toHaveProperty('hiddenData');
  });

  it('does not select hiddenData for public offer details', async () => {
    prisma.offer.findUnique.mockResolvedValue({
      id: 'offer-1',
      title: 'Public offer',
      seller: { id: 'seller-1', displayName: 'Seller', avatarUrl: null },
    });

    const result = await service.findOne({ id: 'offer-1' });

    expect(prisma.offer.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ hiddenData: true }),
      }),
    );
    expect(result).not.toHaveProperty('hiddenData');
  });

  it('filters public offers by fulfillment type', async () => {
    prisma.offer.findMany.mockResolvedValue([]);
    prisma.offer.count.mockResolvedValue(0);

    await service.findAllFiltered({ fulfillmentType: 'DIGITAL_CODE' });

    expect(prisma.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fulfillmentType: {
            equals: 'DIGITAL_CODE',
            mode: 'insensitive',
          },
        }),
      }),
    );
  });

  it('clamps pagination and ignores NaN filters for public offer lists', async () => {
    prisma.offer.findMany.mockResolvedValue([]);
    prisma.offer.count.mockResolvedValue(0);

    await service.findAllFiltered({
      skip: -50,
      take: 100000,
      minPrice: Number.NaN,
      maxPrice: Number.POSITIVE_INFINITY,
      lat: Number.NaN,
      lng: 69.27,
      radiusKm: 500,
    });

    expect(prisma.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
        where: expect.not.objectContaining({
          price: expect.anything(),
          latitude: expect.anything(),
          longitude: expect.anything(),
        }),
      }),
    );
  });

  it('blocks vendor offer creation without an active company', async () => {
    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      status: 'PENDING_MODERATION',
    });

    await expect(
      service.createVendorOffer(
        'seller-1',
        {
          title: 'Offer',
          description: 'Description',
          category: 'SUBSCRIPTIONS',
          hiddenData: 'CODE',
          price: 1,
        },
        'VENDOR',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.offer.create).not.toHaveBeenCalled();
  });

  it('links vendor offers to the active company', async () => {
    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      status: 'ACTIVE',
    });
    prisma.offer.create.mockResolvedValue({ id: 'offer-1' });

    await service.createVendorOffer(
      'seller-1',
      {
        title: 'Offer',
        description: 'Description',
        category: 'SUBSCRIPTIONS',
        hiddenData: 'CODE',
        price: 1,
      },
      'VENDOR',
    );

    expect(prisma.offer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        seller: { connect: { id: 'seller-1' } },
        company: { connect: { id: 'company-1' } },
      }),
    });
  });

  it('lets admins create vendor offers without a company approval check', async () => {
    prisma.offer.create.mockResolvedValue({ id: 'offer-1' });

    await service.createVendorOffer(
      'admin-1',
      {
        title: 'Offer',
        description: 'Description',
        category: 'SUBSCRIPTIONS',
        hiddenData: 'CODE',
        price: 1,
      },
      'ADMIN',
    );

    expect(prisma.company.findUnique).not.toHaveBeenCalled();
    expect(prisma.offer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        seller: { connect: { id: 'admin-1' } },
      }),
    });
  });

  it('enforces offer moderation in the service layer', async () => {
    await expect(
      service.createVendorOffer(
        'admin-1',
        {
          title: 'Clean title',
          description: 'f.u.c.k',
          category: 'SUBSCRIPTIONS',
          hiddenData: 'CODE',
          price: 1,
        },
        'ADMIN',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.update({
        where: { id: 'offer-1' },
        data: { title: { set: 'n@zi offer' } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.offer.create).not.toHaveBeenCalled();
    expect(prisma.offer.update).not.toHaveBeenCalled();
  });

  it('saves active offers without creating duplicates', async () => {
    prisma.offer.findUnique.mockResolvedValue({
      id: 'offer-1',
      isActive: true,
    });
    prisma.savedOffer.upsert.mockResolvedValue({
      id: 'saved-1',
      userId: 'user-1',
      offerId: 'offer-1',
    });

    await expect(service.saveOffer('user-1', 'offer-1')).resolves.toEqual({
      id: 'saved-1',
      userId: 'user-1',
      offerId: 'offer-1',
    });

    expect(prisma.savedOffer.upsert).toHaveBeenCalledWith({
      where: { userId_offerId: { userId: 'user-1', offerId: 'offer-1' } },
      create: {
        user: { connect: { id: 'user-1' } },
        offer: { connect: { id: 'offer-1' } },
        source: 'USER',
      },
      update: {},
      select: expect.any(Object),
    });
  });

  it('unsaves offers idempotently', async () => {
    prisma.savedOffer.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.unsaveOffer('user-1', 'offer-1')).resolves.toEqual({
      deleted: true,
    });

    expect(prisma.savedOffer.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', offerId: 'offer-1' },
    });
  });

  it('charges featured placement atomically and writes a ledger entry', async () => {
    prisma.offer.findUnique.mockResolvedValue({
      id: 'offer-1',
      sellerId: 'seller-1',
      featuredUntil: null,
    });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUniqueOrThrow.mockResolvedValue({ balance: 88_000 });
    prisma.offer.update.mockResolvedValue({
      id: 'offer-1',
      featuredUntil: expect.any(Date),
    });
    prisma.financialEntry.create.mockResolvedValue({ id: 'entry-1' });

    await service.featureOffer('offer-1', 'seller-1', 1);

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'seller-1', balance: { gte: 12_000 } },
      data: { balance: { decrement: 12_000 } },
    });
    expect(prisma.financialEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'seller-1',
        type: 'FEATURED_PLACEMENT',
        amount: -12_000,
        balanceAfter: 88_000,
      }),
    });
  });
});
