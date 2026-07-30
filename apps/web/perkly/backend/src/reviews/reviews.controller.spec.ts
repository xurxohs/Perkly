import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let reviewsService: {
    createForAuthor: jest.Mock;
    findByOfferId: jest.Mock;
    getOfferStats: jest.Mock;
    findByAuthorId: jest.Mock;
  };

  beforeEach(async () => {
    reviewsService = {
      createForAuthor: jest.fn(),
      findByOfferId: jest.fn(),
      getOfferStats: jest.fn(),
      findByAuthorId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: reviewsService }],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a review for the authenticated user', async () => {
    reviewsService.createForAuthor.mockResolvedValue({ id: 'review-1' });
    const body = {
      offerId: 'offer-1',
      rating: 5,
      authorId: 'spoofed-user',
    } as any;

    await expect(
      controller.create({ user: { userId: 'real-user' } } as any, body),
    ).resolves.toEqual({ id: 'review-1' });

    expect(reviewsService.createForAuthor).toHaveBeenCalledWith(
      'real-user',
      body,
    );
  });

  it('returns reviews by offer id', async () => {
    reviewsService.findByOfferId.mockResolvedValue([{ id: 'review-1' }]);

    await expect(controller.findByOfferId('offer-1')).resolves.toEqual([
      { id: 'review-1' },
    ]);
    expect(reviewsService.findByOfferId).toHaveBeenCalledWith('offer-1');
  });

  it('returns offer stats', async () => {
    reviewsService.getOfferStats.mockResolvedValue({
      averageRating: 4.5,
      totalReviews: 2,
    });

    await expect(controller.getOfferStats('offer-1')).resolves.toEqual({
      averageRating: 4.5,
      totalReviews: 2,
    });
  });
});
