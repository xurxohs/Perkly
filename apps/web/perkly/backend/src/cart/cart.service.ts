import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_OFFER_SELECT } from '../offers/offer.selects';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.cartItem.findMany({
      where: {
        userId,
        offer: { isActive: true, moderationStatus: 'APPROVED' },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        offerId: true,
        isGift: true,
        createdAt: true,
        updatedAt: true,
        offer: { select: PUBLIC_OFFER_SELECT },
      },
    });
  }

  async upsert(userId: string, offerId: string, isGift = false) {
    const offer = await this.prisma.offer.findFirst({
      where: {
        id: offerId,
        isActive: true,
        moderationStatus: 'APPROVED',
      },
      select: { id: true },
    });
    if (!offer) throw new NotFoundException('Offer not found');

    await this.prisma.cartItem.upsert({
      where: { userId_offerId: { userId, offerId } },
      create: { userId, offerId, isGift },
      update: { isGift },
    });
    return this.list(userId);
  }

  async remove(userId: string, offerId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId, offerId } });
    return this.list(userId);
  }

  async clear(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return [];
  }
}
