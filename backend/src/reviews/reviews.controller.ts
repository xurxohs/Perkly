import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import type { CreateReviewInput } from './reviews.service';
import { ReviewsService } from './reviews.service';
import { Review } from '@prisma/client';

interface AuthRequest extends Request {
  user: { userId: string };
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Req() req: AuthRequest,
    @Body() createReviewDto: CreateReviewInput,
  ): Promise<Review> {
    return this.reviewsService.createForAuthor(
      req.user.userId,
      createReviewDto,
    );
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
