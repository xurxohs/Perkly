import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Offer } from '@prisma/client';

export const FEATURE_PRICE_PER_DAY = 1; // $1 per day

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.OfferCreateInput): Promise<Offer> {
    return this.prisma.offer.create({ data });
  }

  async findAllFiltered(params: {
    skip?: number;
    take?: number;
    category?: string;
    search?: string;
    sort?: string;
    isFlashDrop?: boolean;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<{ data: Offer[]; total: number }> {
    const {
      skip = 0,
      take = 20,
      category,
      search,
      sort,
      isFlashDrop,
      minPrice,
      maxPrice,
    } = params;

    const where: Prisma.OfferWhereInput = { isActive: true };

    if (category) where.category = String(category);
    if (isFlashDrop !== undefined) where.isFlashDrop = isFlashDrop;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Prisma.FloatFilter = {};
      if (minPrice !== undefined) priceFilter.gte = minPrice;
      if (maxPrice !== undefined) priceFilter.lte = maxPrice;
      where.price = priceFilter;
    }

    let orderBy: Prisma.OfferOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };

    const [allData, total] = await Promise.all([
      this.prisma.offer.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          seller: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      }),
      this.prisma.offer.count({ where }),
    ]);

    // Featured offers (active promotion) appear first
    const now = new Date();
    const featured = allData.filter(
      (o) => o.featuredUntil && o.featuredUntil > now,
    );
    const regular = allData.filter(
      (o) => !o.featuredUntil || o.featuredUntil <= now,
    );

    return { data: [...featured, ...regular], total };
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.OfferWhereUniqueInput;
    where?: Prisma.OfferWhereInput;
    orderBy?: Prisma.OfferOrderByWithRelationInput;
  }): Promise<Offer[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.offer.findMany({ skip, take, cursor, where, orderBy });
  }

  async findOne(
    offerWhereUniqueInput: Prisma.OfferWhereUniqueInput,
  ): Promise<Offer | null> {
    return this.prisma.offer.findUnique({
      where: offerWhereUniqueInput,
      include: {
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async update(params: {
    where: Prisma.OfferWhereUniqueInput;
    data: Prisma.OfferUpdateInput;
  }): Promise<Offer> {
    const { where, data } = params;
    return this.prisma.offer.update({ data, where });
  }

  async remove(where: Prisma.OfferWhereUniqueInput): Promise<Offer> {
    return this.prisma.offer.delete({ where });
  }

  async getVendorOffers(sellerId: string): Promise<Offer[]> {
    return this.prisma.offer.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVendorOffer(
    sellerId: string,
    data: Omit<Prisma.OfferCreateInput, 'seller'>,
  ): Promise<Offer> {
    return this.prisma.offer.create({
      data: { ...data, seller: { connect: { id: sellerId } } },
    });
  }

  async featureOffer(
    offerId: string,
    sellerId: string,
    days: number,
  ): Promise<Offer> {
    if (days < 1 || days > 30) {
      throw new BadRequestException('Days must be between 1 and 30');
    }
    const cost = days * FEATURE_PRICE_PER_DAY;

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.sellerId !== sellerId) {
      throw new BadRequestException('You do not own this offer');
    }

    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
    });
    if (!seller || seller.balance < cost) {
      throw new BadRequestException(
        `Insufficient balance. Need $${cost}, have $${seller?.balance ?? 0}`,
      );
    }

    const now = new Date();
    const base =
      offer.featuredUntil && offer.featuredUntil > now
        ? offer.featuredUntil
        : now;
    const newFeaturedUntil = new Date(base.getTime() + days * 86400_000);

    await this.prisma.user.update({
      where: { id: sellerId },
      data: { balance: { decrement: cost } },
    });

    return this.prisma.offer.update({
      where: { id: offerId },
      data: { featuredUntil: newFeaturedUntil },
    });
  }
}
