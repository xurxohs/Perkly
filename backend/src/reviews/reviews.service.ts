import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Review } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ReviewCreateInput): Promise<Review> {
    return this.prisma.review.create({ data });
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
}
