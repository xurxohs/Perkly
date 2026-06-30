import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OffersService } from './offers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OffersService', () => {
  let service: OffersService;
  let prisma: {
    offer: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    company: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      offer: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OffersService, { provide: PrismaService, useValue: prisma }],
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
});
