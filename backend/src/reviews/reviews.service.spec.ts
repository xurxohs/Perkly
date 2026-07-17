import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: {
    review: {
      create: jest.Mock;
      findMany: jest.Mock;
      aggregate: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      review: {
        create: jest.fn(),
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

  it('creates a review connected to the authenticated author', async () => {
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

  it('does not accept an author from request body', async () => {
    prisma.review.create.mockResolvedValue({ id: 'review-1' });

    await service.createForAuthor('real-user', {
      offerId: 'offer-1',
      rating: 5,
      authorId: 'spoofed-user',
    } as any);

    expect(prisma.review.create).toHaveBeenCalledWith({
      data: {
        offer: { connect: { id: 'offer-1' } },
        author: { connect: { id: 'real-user' } },
        rating: 5,
        comment: undefined,
      },
    });
  });

  it('validates offerId and rating', async () => {
    await expect(
      service.createForAuthor('user-1', { rating: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createForAuthor('user-1', { offerId: 'offer-1', rating: 6 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it('rejects objectionable or link-spam review comments', async () => {
    await expect(
      service.createForAuthor('user-1', {
        offerId: 'offer-1',
        rating: 5,
        comment: 'f.u.c.k',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createForAuthor('user-1', {
        offerId: 'offer-1',
        rating: 5,
        comment: [
          'https://one.example',
          'https://two.example',
          'https://three.example',
          'https://four.example',
        ].join(' '),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it('returns offer review stats with zero fallback', async () => {
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { id: 0 },
    });

    await expect(service.getOfferStats('offer-1')).resolves.toEqual({
      averageRating: 0,
      totalReviews: 0,
    });
  });
});
