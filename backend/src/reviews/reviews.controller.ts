import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Prisma, Review } from '@prisma/client';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Body() createReviewDto: Prisma.ReviewCreateInput): Promise<Review> {
    return this.reviewsService.create(createReviewDto);
  }

  @Get('offer/:offerId')
  findByOfferId(@Param('offerId') offerId: string): Promise<Review[]> {
    return this.reviewsService.findByOfferId(offerId);
  }

  @Get('offer/:offerId/stats')
  getOfferStats(
    @Param('offerId') offerId: string,
  ): Promise<{ averageRating: number; totalReviews: number }> {
    return this.reviewsService.getOfferStats(offerId);
  }

  @Get('author/:authorId')
  findByAuthorId(@Param('authorId') authorId: string): Promise<Review[]> {
    return this.reviewsService.findByAuthorId(authorId);
  }
}
