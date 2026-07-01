import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Review } from '@prisma/client';

export interface CreateReviewInput {
  offerId?: unknown;
  rating?: unknown;
  comment?: unknown;
}

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createForAuthor(
    authorId: string,
    input: CreateReviewInput,
  ): Promise<Review> {
    const offerId = this.requiredString(input.offerId, 'offerId');
    const rating = this.normalizeRating(input.rating);
    const comment = this.optionalString(input.comment);

    return this.prisma.review.create({
      data: {
        offer: { connect: { id: offerId } },
        author: { connect: { id: authorId } },
        rating,
        comment,
      },
    });
  }

  async findByOfferId(offerId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { offerId },
      include: {
        author: {
          select: { id: true, displayName: true, avatarUrl: true, tier: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByAuthorId(authorId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { authorId },
      include: { offer: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOfferStats(
    offerId: string,
  ): Promise<{ averageRating: number; totalReviews: number }> {
    const aggr = await this.prisma.review.aggregate({
      where: { offerId },
      _avg: { rating: true },
      _count: { id: true },
    });
    return {
      averageRating: aggr._avg.rating || 0,
      totalReviews: aggr._count.id || 0,
    };
  }

  private requiredString(value: unknown, field: string): string {
    const normalized = this.optionalString(value);
    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }
    return normalized;
  }

  private optionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeRating(value: unknown): number {
    const rating = Number(value ?? 5);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(
        'rating must be an integer between 1 and 5',
      );
    }
    return rating;
  }
}
