import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Offer } from '@prisma/client';
import {
  PublicOffer,
  PUBLIC_OFFER_SELECT,
  SavedOffer,
  SAVED_OFFER_SELECT,
  VendorOffer,
  VENDOR_OFFER_SELECT,
} from './offer.selects';
import { normalizePagination, parseFiniteNumber } from '../common/pagination';
import { StorageService } from '../storage/storage.service';
import { assertAcceptableUserContent } from '../common/content-moderation';

export const FEATURE_PRICE_PER_DAY = 12000; // 12 000 UZS per day

@Injectable()
export class OffersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  private readonly relatedStatuses = [
    'PAID',
    'ESCROW',
    'ACTIVATED',
    'COMPLETED',
  ];

  async create(data: Prisma.OfferCreateInput, adminId: string): Promise<Offer> {
    this.assertOfferContent(data);
    return this.prisma.offer.create({
      data: {
        ...data,
        moderationStatus: 'APPROVED',
        moderationNote: null,
        moderationAt: new Date(),
        moderationBy: adminId,
      },
    });
  }

  async findAllFiltered(params: {
    skip?: number;
    take?: number;
    category?: string;
    fulfillmentType?: string;
    search?: string;
    sort?: string;
    isFlashDrop?: boolean;
    minPrice?: number;
    maxPrice?: number;
    lat?: number;
    lng?: number;
    radiusKm?: number;
  }): Promise<{ data: PublicOffer[]; total: number }> {
    const { skip, take } = normalizePagination(params.skip, params.take, {
      defaultTake: 20,
      maxTake: 100,
    });
    const { category, fulfillmentType, search, sort, isFlashDrop } = params;
    const minPrice = parseFiniteNumber(params.minPrice);
    const maxPrice = parseFiniteNumber(params.maxPrice);
    const geo = this.normalizeGeoFilter(
      params.lat,
      params.lng,
      params.radiusKm,
    );

    const where: Prisma.OfferWhereInput = {
      isActive: true,
      moderationStatus: 'APPROVED',
    };

    if (category) {
      where.category = {
        equals: String(category).trim(),
        mode: Prisma.QueryMode.insensitive,
      };
    }
    if (fulfillmentType) {
      where.fulfillmentType = {
        equals: String(fulfillmentType).trim(),
        mode: Prisma.QueryMode.insensitive,
      };
    }
    if (isFlashDrop !== undefined) where.isFlashDrop = isFlashDrop;

    if (search) {
      const normalizedSearch = search.trim();
      where.OR = [
        {
          title: {
            contains: normalizedSearch,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          description: {
            contains: normalizedSearch,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Prisma.FloatFilter = {};
      if (minPrice !== undefined) priceFilter.gte = minPrice;
      if (maxPrice !== undefined) priceFilter.lte = maxPrice;
      where.price = priceFilter;
    }

    if (geo) {
      const { lat, lng, radiusKm } = geo;
      const ky = 40000 / 360;
      const kx = Math.cos((Math.PI * lat) / 180.0) * ky;
      const dx = radiusKm / kx;
      const dy = radiusKm / ky;
      where.latitude = {
        gte: lat - dy,
        lte: lat + dy,
      };
      where.longitude = {
        gte: lng - dx,
        lte: lng + dx,
      };
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
        select: PUBLIC_OFFER_SELECT,
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
  ): Promise<PublicOffer | null> {
    return this.prisma.offer.findFirst({
      where: {
        ...offerWhereUniqueInput,
        isActive: true,
        moderationStatus: 'APPROVED',
      },
      select: PUBLIC_OFFER_SELECT,
    });
  }

  async saveOffer(userId: string, offerId: string): Promise<SavedOffer> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, isActive: true, moderationStatus: true },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    if (!offer.isActive || offer.moderationStatus !== 'APPROVED') {
      throw new BadRequestException('Offer is no longer active');
    }

    return this.prisma.savedOffer.upsert({
      where: { userId_offerId: { userId, offerId } },
      create: {
        user: { connect: { id: userId } },
        offer: { connect: { id: offerId } },
        source: 'USER',
      },
      update: {},
      select: SAVED_OFFER_SELECT,
    });
  }

  async unsaveOffer(
    userId: string,
    offerId: string,
  ): Promise<{ deleted: boolean }> {
    const result = await this.prisma.savedOffer.deleteMany({
      where: { userId, offerId },
    });

    return { deleted: result.count > 0 };
  }

  async findRelatedOffers(
    id: string,
    take = 6,
  ): Promise<{ data: PublicOffer[]; total: number }> {
    const normalizedTake = Math.min(Math.max(take, 1), 12);
    const offer = await this.prisma.offer.findFirst({
      where: { id, isActive: true, moderationStatus: 'APPROVED' },
      select: { id: true, category: true },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const sourceTransactions = await this.prisma.transaction.findMany({
      where: {
        offerId: id,
        status: { in: this.relatedStatuses },
      },
      select: { buyerId: true },
    });

    const buyerIds = Array.from(
      new Set(sourceTransactions.map((tx) => tx.buyerId)),
    );
    const coPurchaseCounts = new Map<string, number>();

    if (buyerIds.length > 0) {
      const coPurchases = await this.prisma.transaction.findMany({
        where: {
          buyerId: { in: buyerIds },
          offerId: { not: id },
          status: { in: this.relatedStatuses },
        },
        select: { offerId: true },
      });

      for (const transaction of coPurchases) {
        coPurchaseCounts.set(
          transaction.offerId,
          (coPurchaseCounts.get(transaction.offerId) ?? 0) + 1,
        );
      }
    }

    const rankedOfferIds = Array.from(coPurchaseCounts.entries())
      .sort((lhs, rhs) => {
        if (lhs[1] === rhs[1]) {
          return lhs[0].localeCompare(rhs[0]);
        }
        return rhs[1] - lhs[1];
      })
      .slice(0, normalizedTake * 3)
      .map(([offerId]) => offerId);

    const relatedOffers = await this.loadRelatedOffersByIds(rankedOfferIds);
    const fallbackOffers = await this.loadFallbackRelatedOffers(
      offer.category,
      id,
      normalizedTake,
      new Set(relatedOffers.map((relatedOffer) => relatedOffer.id)),
    );

    const data = [...relatedOffers, ...fallbackOffers].slice(0, normalizedTake);
    return { data, total: data.length };
  }

  async recommendationsForUser(
    userId: string,
    input: { lat?: number; lng?: number; limit?: number; exclude: Set<string> },
  ): Promise<{
    personalized: PublicOffer[];
    nearby: PublicOffer[];
    tier: PublicOffer[];
  }> {
    const limit = Math.min(Math.max(Math.floor(input.limit ?? 6), 1), 12);
    const [user, transactions, candidates] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          tier: true,
          interests: { select: { category: true, weight: true } },
        },
      }),
      this.prisma.transaction.findMany({
        where: { buyerId: userId, status: { in: this.relatedStatuses } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          price: true,
          offerId: true,
          offer: { select: { category: true } },
        },
      }),
      this.prisma.offer.findMany({
        where: { isActive: true, moderationStatus: 'APPROVED' },
        orderBy: [{ featuredUntil: 'desc' }, { createdAt: 'desc' }],
        take: 120,
        select: PUBLIC_OFFER_SELECT,
      }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    const excluded = new Set([
      ...input.exclude,
      ...transactions.map((item) => item.offerId),
    ]);
    const categoryWeights = new Map<string, number>();
    for (const interest of user.interests) {
      categoryWeights.set(
        interest.category,
        (categoryWeights.get(interest.category) ?? 0) + interest.weight * 12,
      );
    }
    for (const transaction of transactions) {
      const category = transaction.offer?.category;
      if (category)
        categoryWeights.set(
          category,
          (categoryWeights.get(category) ?? 0) + 10,
        );
    }
    const averageSpend = transactions.length
      ? transactions.reduce((sum, item) => sum + item.price, 0) /
        transactions.length
      : 0;
    const available = candidates.filter((offer) => !excluded.has(offer.id));
    const used = new Set<string>();
    const takeRanked = (score: (offer: PublicOffer) => number) =>
      available
        .filter((offer) => !used.has(offer.id))
        .map((offer) => ({ offer, score: score(offer) }))
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.offer.createdAt.getTime() - a.offer.createdAt.getTime(),
        )
        .slice(0, limit)
        .map(({ offer }) => {
          used.add(offer.id);
          return offer;
        });

    const personalized = takeRanked((offer) => {
      let score = categoryWeights.get(offer.category) ?? 10;
      if (
        averageSpend > 0 &&
        Math.abs(offer.price - averageSpend) <=
          Math.max(averageSpend * 0.35, 10_000)
      )
        score += 20;
      score += Math.min(offer.discountPercent ?? 0, 40);
      if (offer.isFlashDrop) score += 10;
      if (offer.featuredUntil && offer.featuredUntil > new Date()) score += 12;
      return score;
    });

    const hasLocation = input.lat !== undefined && input.lng !== undefined;
    const distance = (offer: PublicOffer) => {
      if (!hasLocation || offer.latitude == null || offer.longitude == null)
        return Number.POSITIVE_INFINITY;
      const rad = Math.PI / 180;
      const dLat = (offer.latitude - input.lat!) * rad;
      const dLng = (offer.longitude - input.lng!) * rad;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(input.lat! * rad) *
          Math.cos(offer.latitude * rad) *
          Math.sin(dLng / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    const nearby = hasLocation
      ? available
          .filter((offer) => !used.has(offer.id) && distance(offer) <= 25)
          .sort((a, b) => distance(a) - distance(b))
          .slice(0, limit)
      : [];
    nearby.forEach((offer) => used.add(offer.id));

    const tier = takeRanked((offer) => {
      if (user.tier === 'PLATINUM')
        return (offer.isExclusive ? 35 : 5) + (offer.featuredUntil ? 15 : 0);
      if (user.tier === 'GOLD')
        return (offer.discountPercent ?? 0) + (offer.isFlashDrop ? 15 : 0);
      return (
        (offer.price <= Math.max(averageSpend, 150_000) ? 20 : 0) +
        (offer.discountPercent ?? 0)
      );
    });

    return { personalized, nearby, tier };
  }

  async update(params: {
    where: Prisma.OfferWhereUniqueInput;
    data: Prisma.OfferUpdateInput;
  }): Promise<Offer> {
    const { where, data } = params;
    this.assertOfferContent(data);
    return this.prisma.offer.update({ data, where });
  }

  async updateVendorOffer(params: {
    where: Prisma.OfferWhereUniqueInput;
    data: Prisma.OfferUpdateInput;
  }): Promise<Offer> {
    const { where, data } = params;
    this.assertOfferContent(data);
    return this.prisma.offer.update({
      where,
      data: {
        ...data,
        isActive: false,
        moderationStatus: 'PENDING',
        moderationNote: null,
        moderationAt: null,
        moderationBy: null,
      },
    });
  }

  async remove(where: Prisma.OfferWhereUniqueInput): Promise<Offer> {
    // Preserve purchase history and financial references.
    return this.prisma.offer.update({
      where,
      data: { isActive: false },
    });
  }

  async getVendorOffers(sellerId: string): Promise<VendorOffer[]> {
    return this.prisma.offer.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      select: VENDOR_OFFER_SELECT,
    });
  }

  async createVendorOffer(
    sellerId: string,
    data: Omit<Prisma.OfferCreateInput, 'seller'>,
    sellerRole?: string,
  ): Promise<Offer> {
    this.assertOfferContent(data);
    if (sellerRole !== 'ADMIN') {
      const activeCompany = await this.prisma.company.findUnique({
        where: { ownerUserId: sellerId },
        select: { id: true, status: true },
      });

      if (!activeCompany || activeCompany.status !== 'ACTIVE') {
        throw new ForbiddenException(
          'Active company approval is required to create vendor offers',
        );
      }

      return this.prisma.offer.create({
        data: {
          ...data,
          isActive: false,
          moderationStatus: 'PENDING',
          moderationNote: null,
          moderationAt: null,
          moderationBy: null,
          seller: { connect: { id: sellerId } },
          company: { connect: { id: activeCompany.id } },
        },
      });
    }

    return this.prisma.offer.create({
      data: {
        ...data,
        moderationStatus: 'APPROVED',
        moderationNote: null,
        moderationAt: new Date(),
        moderationBy: sellerId,
        seller: { connect: { id: sellerId } },
      },
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
    if (!offer.isActive || offer.moderationStatus !== 'APPROVED') {
      throw new BadRequestException('Only approved active offers can be featured');
    }
    if (offer.sellerId !== sellerId) {
      throw new BadRequestException('You do not own this offer');
    }

    const now = new Date();
    const base =
      offer.featuredUntil && offer.featuredUntil > now
        ? offer.featuredUntil
        : now;
    const newFeaturedUntil = new Date(base.getTime() + days * 86400_000);

    return this.prisma.$transaction(async (tx) => {
      const debited = await tx.user.updateMany({
        where: {
          id: sellerId,
          balance: { gte: cost },
        },
        data: { balance: { decrement: cost } },
      });
      if (debited.count !== 1) {
        const seller = await tx.user.findUnique({
          where: { id: sellerId },
          select: { balance: true },
        });
        throw new BadRequestException(
          `Insufficient balance. Need ${cost.toLocaleString('ru-RU')} UZS, have ${(seller?.balance ?? 0).toLocaleString('ru-RU')} UZS`,
        );
      }

      const seller = await tx.user.findUniqueOrThrow({
        where: { id: sellerId },
        select: { balance: true },
      });
      const featuredOffer = await tx.offer.update({
        where: { id: offerId },
        data: { featuredUntil: newFeaturedUntil },
      });
      await tx.financialEntry.create({
        data: {
          userId: sellerId,
          type: 'FEATURED_PLACEMENT',
          amount: -cost,
          balanceAfter: seller.balance,
          idempotencyKey: `featured-placement:${offerId}:${randomUUID()}`,
          metadata: JSON.stringify({
            days,
            featuredUntil: newFeaturedUntil.toISOString(),
          }),
        },
      });
      return featuredOffer;
    });
  }

  private assertOfferContent(
    data:
      | Prisma.OfferCreateInput
      | Omit<Prisma.OfferCreateInput, 'seller'>
      | Prisma.OfferUpdateInput,
  ) {
    const title = this.stringUpdateValue(data.title);
    const description = this.stringUpdateValue(data.description);
    if (title !== undefined) {
      assertAcceptableUserContent(title, 'Offer title');
    }
    if (description !== undefined) {
      assertAcceptableUserContent(description, 'Offer description');
    }
  }

  private stringUpdateValue(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (
      value &&
      typeof value === 'object' &&
      'set' in value &&
      typeof value.set === 'string'
    ) {
      return value.set;
    }
    return undefined;
  }

  private async loadRelatedOffersByIds(
    offerIds: string[],
  ): Promise<PublicOffer[]> {
    if (offerIds.length === 0) {
      return [];
    }

    const offers = await this.prisma.offer.findMany({
      where: {
        id: { in: offerIds },
        isActive: true,
        moderationStatus: 'APPROVED',
      },
      select: PUBLIC_OFFER_SELECT,
    });

    const offersById = new Map(offers.map((offer) => [offer.id, offer]));

    const orderedOffers: PublicOffer[] = [];

    for (const offerId of offerIds) {
      const offer = offersById.get(offerId);
      if (offer) {
        orderedOffers.push(offer);
      }
    }

    return orderedOffers;
  }

  private async loadFallbackRelatedOffers(
    category: string | null,
    excludedOfferId: string,
    take: number,
    excludedIds: Set<string>,
  ): Promise<PublicOffer[]> {
    if (!category || take <= 0) {
      return [];
    }

    return this.prisma.offer.findMany({
      where: {
        id: { notIn: [excludedOfferId, ...Array.from(excludedIds)] },
        category,
        isActive: true,
        moderationStatus: 'APPROVED',
      },
      orderBy: [{ featuredUntil: 'desc' }, { createdAt: 'desc' }],
      take,
      select: PUBLIC_OFFER_SELECT,
    });
  }

  private normalizeGeoFilter(
    lat: unknown,
    lng: unknown,
    radiusKm: unknown,
  ): { lat: number; lng: number; radiusKm: number } | null {
    const parsedLat = parseFiniteNumber(lat);
    const parsedLng = parseFiniteNumber(lng);
    const parsedRadius = parseFiniteNumber(radiusKm);

    if (
      parsedLat === undefined ||
      parsedLng === undefined ||
      parsedRadius === undefined ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      return null;
    }

    return {
      lat: parsedLat,
      lng: parsedLng,
      radiusKm: Math.min(Math.max(parsedRadius, 0), 100),
    };
  }

  async findRaw(id: string): Promise<Offer | null> {
    return this.prisma.offer.findUnique({ where: { id } });
  }

  async saveVendorLogo(
    dataUrl: string,
  ): Promise<{ url: string; thumbnailUrl: string }> {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new BadRequestException('Expected a base64 data URL');
    }
    const mime = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('Image must be between 1 byte and 10 MB');
    }

    if (!mime.startsWith('image/')) {
      throw new BadRequestException('Expected an image');
    }

    const allowed = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ]);
    if (!allowed.has(mime.toLowerCase())) {
      throw new BadRequestException('Unsupported image type');
    }

    const baseName = `${Date.now()}-${randomUUID()}`;
    let fileName = `${baseName}.webp`;
    let thumbnailName = `${baseName}-thumb.webp`;
    let outputMime = 'image/webp';
    let optimized: Buffer;
    let thumbnail: Buffer;
    let sharpFactory: typeof import('sharp') | undefined;
    try {
      const sharpModule = await import('sharp');
      sharpFactory = ((
        sharpModule as unknown as { default?: typeof import('sharp') }
      ).default ?? sharpModule) as unknown as typeof import('sharp');
    } catch {
      // Keep staging uploads available on legacy CPUs that cannot load the
      // native sharp binary. Production should use a compatible image worker.
    }

    if (!sharpFactory) {
      if (!this.hasExpectedImageSignature(buffer, mime)) {
        throw new BadRequestException('Invalid or corrupted image');
      }
      const extension =
        mime.toLowerCase() === 'image/png'
          ? 'png'
          : mime.toLowerCase() === 'image/webp'
            ? 'webp'
            : 'jpg';
      fileName = `${baseName}.${extension}`;
      thumbnailName = `${baseName}-thumb.${extension}`;
      outputMime = mime.toLowerCase();
      optimized = buffer;
      thumbnail = buffer;
    } else {
      try {
        const pipeline = sharpFactory(buffer, {
          limitInputPixels: 40_000_000,
        }).rotate();
        [optimized, thumbnail] = await Promise.all([
          pipeline
            .clone()
            .resize({
              width: 1600,
              height: 1600,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality: 82, effort: 4 })
            .toBuffer(),
          pipeline
            .clone()
            .resize({
              width: 480,
              height: 480,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality: 76, effort: 4 })
            .toBuffer(),
        ]);
      } catch {
        throw new BadRequestException('Invalid or corrupted image');
      }
    }

    const [url, thumbnailUrl] = await Promise.all([
      this.storage.put(`vendor/${fileName}`, optimized, outputMime),
      this.storage.put(`vendor/${thumbnailName}`, thumbnail, outputMime),
    ]);
    return { url, thumbnailUrl };
  }

  private hasExpectedImageSignature(buffer: Buffer, mime: string) {
    const normalized = mime.toLowerCase();
    if (normalized === 'image/png') {
      return (
        buffer.length >= 8 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    }
    if (normalized === 'image/jpeg' || normalized === 'image/jpg') {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }
    if (normalized === 'image/webp') {
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    }
    return false;
  }
}
