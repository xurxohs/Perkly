import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: {
    offer: {
      findUnique: jest.Mock;
    };
    transaction: {
      findFirst: jest.Mock;
    };
    review: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      aggregate: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      offer: {
        findUnique: jest.fn(),
      },
      transaction: {
        findFirst: jest.fn(),
      },
      review: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a review connected to the authenticated author if purchased', async () => {
    prisma.offer.findUnique.mockResolvedValue({ id: 'offer-1', sellerId: 'seller-1' });
    prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1', buyerId: 'user-1', offerId: 'offer-1', status: 'COMPLETED' });
    prisma.review.findFirst.mockResolvedValue(null);
    prisma.review.create.mockResolvedValue({
      id: 'review-1',
      authorId: 'user-1',
      offerId: 'offer-1',
      rating: 4,
      comment: 'Good',
    });

    await expect(
      service.createForAuthor('user-1', {
        offerId: ' offer-1 ',
        rating: '4',
        comment: ' Good ',
      }),
    ).resolves.toMatchObject({ id: 'review-1' });

    expect(prisma.review.create).toHaveBeenCalledWith({
      data: {
        offer: { connect: { id: 'offer-1' } },
        author: { connect: { id: 'user-1' } },
        rating: 4,
        comment: 'Good',
      },
    });
  });

  it('rejects review if user has not purchased', async () => {
    prisma.offer.findUnique.mockResolvedValue({ id: 'offer-1', sellerId: 'seller-1' });
    prisma.transaction.findFirst.mockResolvedValue(null);

    await expect(
      service.createForAuthor('user-1', { offerId: 'offer-1', rating: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it('rejects review if user has already reviewed', async () => {
    prisma.offer.findUnique.mockResolvedValue({ id: 'offer-1', sellerId: 'seller-1' });
    prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1' });
    prisma.review.findFirst.mockResolvedValue({ id: 'existing-review' });

    await expect(
      service.createForAuthor('user-1', { offerId: 'offer-1', rating: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.review.create).not.toHaveBeenCalled();
  });
});
