import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { REWARD_POINT_VALUE_UZS } from '../common/money';
import { TtlCache } from '../common/ttl-cache';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { EventsService } from '../events/events.service';
import { PUBLIC_OFFER_SELECT } from '../offers/offer.selects';
import { PrismaService } from '../prisma/prisma.service';

type OptionalUser = {
  userId: string;
  role?: string;
  tier?: string;
};

type HomeGeoQuery = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
};

type HomeOfferWithSeller = Prisma.OfferGetPayload<{
  select: typeof PUBLIC_OFFER_SELECT;
}>;

type HomeBadge = {
  text: string;
  style: 'distance' | 'urgency' | 'status' | 'tier';
};

type HomeTransactionForSavings = {
  id?: string;
  offerId?: string;
  price: number;
  status?: string;
  createdAt?: Date;
  offer?: {
    category?: string | null;
    price?: number | null;
    discountPercent?: number | null;
  } | null;
};

type HomeEngagementSummary = {
  todayEvents: Map<string, number>;
  weekEvents: Map<string, number>;
  claimedMissionIds: Set<string>;
};

const DAILY_WHEEL_LIMIT = 3;
const DAILY_BONUS_EVENT = 'DAILY_BONUS_CLAIMED';
const DAILY_MISSION_CLAIMED_PREFIX = 'DAILY_MISSION_CLAIMED:';
const ACTIVE_TRANSACTION_STATUSES = ['PAID', 'ESCROW', 'DISPUTED'];
const COMPLETED_TRANSACTION_STATUSES = ['COMPLETED', 'SUCCESS', 'ACTIVATED'];

@Injectable()
export class HomeService {
  private readonly cache = new TtlCache();

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly eventsService: EventsService,
  ) {}

  async getFeed(user: OptionalUser | null, geo: HomeGeoQuery) {
    const normalizedGeo = this.normalizeGeo(geo);

    const [trendingOffers, flashDrops, nearbyOffers, upcomingEvents] =
      await Promise.all([
        this.cache.getOrSet('trending', 60_000, () =>
          this.loadTrendingOffers(),
        ),
        this.cache.getOrSet('flashDrops', 30_000, () => this.loadFlashDrops()),
        this.loadNearbyOffersCached(normalizedGeo),
        this.cache.getOrSet('upcomingEvents', 60_000, () =>
          this.loadUpcomingEvents(),
        ),
      ]);
    const publicSavingsSummary = this.buildSavingsSummary(
      [],
      [...flashDrops, ...nearbyOffers, ...trendingOffers],
    );

    if (!user) {
      return {
        userSummary: null,
        savingsSummary: publicSavingsSummary,
        streakStatus: null,
        dailyBonus: null,
        promoBanners: this.buildPromoBanners(
          flashDrops,
          nearbyOffers,
          trendingOffers,
          publicSavingsSummary,
        ),
        priorityActions: this.publicPriorityActions(
          flashDrops,
          nearbyOffers,
          upcomingEvents,
          publicSavingsSummary,
        ),
        wheelStatus: null,
        unreadChats: null,
        activeTransactions: null,
        flashDrops: this.mapOfferItems(
          flashDrops,
          'Скоро исчезнет',
          normalizedGeo,
        ),
        personalizedOffers: this.mapOfferItems(
          trendingOffers,
          'Свежая находка',
          normalizedGeo,
        ),
        nearbyOffers: this.mapOfferItems(
          nearbyOffers,
          'Рядом с вами',
          normalizedGeo,
        ),
        tierOffers: [],
        trendingOffers: this.mapOfferItems(
          trendingOffers,
          'Популярно сейчас',
          normalizedGeo,
        ),
        upcomingEvents,
        squadProgress: null,
        sellerSummary: null,
        capabilities: null,
        trustSummary: this.buildTrustSummary(null),
        streakMultiplier: null,
        dailyMissions: [],
        lostSavings: this.buildLostSavings(
          null,
          null,
          publicSavingsSummary,
          flashDrops,
        ),
        weeklyRecap: null,
        generatedAt: new Date().toISOString(),
      };
    }

    const [
      userSummary,
      wheelStatus,
      unreadChats,
      activeTransactions,
      transactions,
      dailyBonus,
      squadProgress,
      engagementSummary,
    ] = await Promise.all([
      this.loadUserSummary(user.userId),
      this.loadWheelStatus(user.userId),
      this.loadUnreadChats(user.userId),
      this.loadActiveTransactions(user.userId),
      this.loadRecentTransactions(user.userId),
      this.loadDailyBonusStatus(user.userId),
      this.loadSquadProgress(user.userId),
      this.loadEngagementSummary(user.userId),
    ]);

    const personalizedOffers = this.rankPersonalizedOffers(
      trendingOffers,
      transactions,
    );
    const tierOffers = this.rankTierOffers(
      trendingOffers,
      userSummary?.tier ?? user.tier ?? 'SILVER',
    );
    const allCandidateOffers = [
      ...flashDrops,
      ...nearbyOffers,
      ...personalizedOffers,
      ...tierOffers,
      ...trendingOffers,
    ];
    const savingsSummary = this.buildSavingsSummary(
      transactions,
      allCandidateOffers,
    );
    const streakMultiplier = this.buildStreakMultiplier(dailyBonus);
    const dailyMissions = this.buildDailyMissions({
      dailyBonus,
      wheelStatus,
      transactions,
      engagementSummary,
      streakMultiplier,
    });
    const lostSavings = this.buildLostSavings(
      dailyBonus,
      wheelStatus,
      savingsSummary,
      flashDrops,
    );
    const weeklyRecap = this.buildWeeklyRecap(
      transactions,
      engagementSummary,
      dailyBonus,
    );

    return {
      userSummary,
      savingsSummary,
      streakStatus: dailyBonus,
      dailyBonus,
      promoBanners: this.buildPromoBanners(
        flashDrops,
        nearbyOffers,
        trendingOffers,
        savingsSummary,
      ),
      priorityActions: this.privatePriorityActions({
        dailyBonus,
        savingsSummary,
        wheelStatus,
        unreadChats,
        activeTransactions,
        flashDrops,
        nearbyOffers,
        upcomingEvents,
        squadProgress,
        dailyMissions,
        lostSavings,
      }),
      wheelStatus,
      unreadChats,
      activeTransactions,
      flashDrops: this.mapOfferItems(
        flashDrops,
        'Скоро исчезнет',
        normalizedGeo,
      ),
      personalizedOffers: this.mapOfferItems(
        personalizedOffers,
        'Похоже на ваши покупки',
        normalizedGeo,
      ),
      nearbyOffers: this.mapOfferItems(
        nearbyOffers,
        'Рядом с вами',
        normalizedGeo,
      ),
      tierOffers: this.mapOfferItems(
        tierOffers,
        'Под ваш статус',
        normalizedGeo,
      ),
      trendingOffers: this.mapOfferItems(
        trendingOffers,
        'Популярно сейчас',
        normalizedGeo,
      ),
      upcomingEvents,
      squadProgress,
      sellerSummary: null,
      capabilities: null,
      trustSummary: this.buildTrustSummary(activeTransactions),
      streakMultiplier,
      dailyMissions,
      lostSavings,
      weeklyRecap,
      generatedAt: new Date().toISOString(),
    };
  }

  private loadTrendingOffers(take = 8) {
    return this.prisma.offer.findMany({
      where: { isActive: true, moderationStatus: 'APPROVED' },
      orderBy: [{ featuredUntil: 'desc' }, { createdAt: 'desc' }],
      take,
      select: PUBLIC_OFFER_SELECT,
    });
  }

  private loadFlashDrops(take = 5) {
    return this.prisma.offer.findMany({
      where: {
        isActive: true,
        moderationStatus: 'APPROVED',
        isFlashDrop: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ expiresAt: 'asc' }, { discountPercent: 'desc' }],
      take,
      select: PUBLIC_OFFER_SELECT,
    });
  }

  private loadNearbyOffersCached(geo: Required<HomeGeoQuery> | null) {
    if (!geo) return Promise.resolve([]);
    const key = `nearby:${geo.lat.toFixed(3)}:${geo.lng.toFixed(3)}:${geo.radiusKm}`;
    return this.cache.getOrSet(key, 30_000, () => this.loadNearbyOffers(geo));
  }

  private async loadNearbyOffers(geo: Required<HomeGeoQuery> | null, take = 8) {
    if (!geo) return [];

    const { lat, lng, radiusKm } = geo;
    const ky = 40000 / 360;
    const kx = Math.cos((Math.PI * lat) / 180.0) * ky;
    const dx = radiusKm / kx;
    const dy = radiusKm / ky;

    const offers = await this.prisma.offer.findMany({
      where: {
        isActive: true,
        moderationStatus: 'APPROVED',
        latitude: { gte: lat - dy, lte: lat + dy },
        longitude: { gte: lng - dx, lte: lng + dx },
      },
      orderBy: { createdAt: 'desc' },
      take: take * 3,
      select: PUBLIC_OFFER_SELECT,
    });

    return offers
      .map((offer) => ({
        offer,
        distanceMeters: this.distanceMeters(
          geo,
          offer.latitude,
          offer.longitude,
        ),
      }))
      .sort((left, right) => left.distanceMeters - right.distanceMeters)
      .slice(0, take)
      .map((item) => item.offer);
  }

  private async loadUpcomingEvents() {
    const events = await this.eventsService.findAll({
      skip: 0,
      take: 6,
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
    });

    return events.data.map((event) => {
      const badges = this.eventBadges(event.date, event.participantsCount);
      return {
        event,
        badges,
        startsAt: event.date,
      };
    });
  }

  private loadUserSummary(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        tier: true,
        balance: true,
        rewardPoints: true,
        updatedAt: true,
      },
    });
  }

  private async loadWheelStatus(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const nextResetAt = new Date(startOfDay);
    nextResetAt.setDate(nextResetAt.getDate() + 1);

    const spinsUsed = await this.prisma.analyticsEvent.count({
      where: {
        userId,
        eventType: 'WHEEL_REWARD_CLAIMED',
        createdAt: { gte: startOfDay },
      },
    });
    const spinsRemaining = Math.max(0, DAILY_WHEEL_LIMIT - spinsUsed);

    return {
      dailyLimit: DAILY_WHEEL_LIMIT,
      spinsUsed,
      spinsRemaining,
      canSpin: spinsRemaining > 0,
      resetAt: nextResetAt.toISOString(),
    };
  }

  private async loadDailyBonusStatus(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const nextResetAt = new Date(startOfDay);
    nextResetAt.setDate(nextResetAt.getDate() + 1);
    const startWindow = new Date(startOfDay);
    startWindow.setDate(startWindow.getDate() - 60);

    const claims = await this.prisma.analyticsEvent.findMany({
      where: {
        userId,
        eventType: DAILY_BONUS_EVENT,
        createdAt: { gte: startWindow },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    const claimedDays = new Set(
      claims.map((claim) => this.dayKey(claim.createdAt)),
    );
    const todayKey = this.dayKey(startOfDay);
    const yesterday = new Date(startOfDay);
    yesterday.setDate(yesterday.getDate() - 1);
    const claimedToday = claimedDays.has(todayKey);
    const currentStreak = this.countStreak(
      claimedDays,
      claimedToday ? startOfDay : yesterday,
    );
    const nextClaimStreak = currentStreak + 1;

    return {
      currentStreak,
      longestStreak: this.longestStreak(claimedDays),
      canClaimToday: !claimedToday,
      claimedToday,
      streakAtRisk: !claimedToday && claimedDays.has(this.dayKey(yesterday)),
      todayReward: this.dailyBonusReward(nextClaimStreak),
      nextReward: this.dailyBonusReward(nextClaimStreak + 1),
      weekProgress: this.weekProgress(startOfDay, claimedDays),
      resetAt: nextResetAt.toISOString(),
    };
  }

  private async loadUnreadChats(userId: string) {
    const blockRows = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = blockRows.map((row) =>
      row.blockerId === userId ? row.blockedId : row.blockerId,
    );
    const roomIds = await this.prisma.chatRoom.findMany({
      where: {
        AND: [
          { participants: { some: { id: userId } } },
          {
            OR: [
              { type: { not: 'DIRECT' } },
              { participants: { none: { id: { in: blockedIds } } } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    const ids = roomIds.map((room) => room.id);

    if (ids.length === 0) {
      return { rooms: 0, totalUnread: 0, latestRoomId: null };
    }

    const [unreadRows, latestUnread] = await Promise.all([
      this.prisma.message.groupBy({
        by: ['roomId'],
        where: {
          roomId: { in: ids },
          isRead: false,
          senderId: { not: userId },
        },
        _count: { _all: true },
      }),
      this.prisma.message.findFirst({
        where: {
          roomId: { in: ids },
          isRead: false,
          senderId: { not: userId },
        },
        orderBy: { createdAt: 'desc' },
        select: { roomId: true },
      }),
    ]);

    return {
      rooms: unreadRows.length,
      totalUnread: unreadRows.reduce((sum, row) => sum + row._count._all, 0),
      latestRoomId: latestUnread?.roomId ?? null,
    };
  }

  private async loadActiveTransactions(userId: string) {
    const where: Prisma.TransactionWhereInput = {
      OR: [{ buyerId: userId }, { offer: { sellerId: userId } }],
    };
    const [active, completed, recent] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['status'],
        where: { ...where, status: { in: ACTIVE_TRANSACTION_STATUSES } },
        _count: { _all: true },
      }),
      this.prisma.transaction.count({
        where: { ...where, status: { in: COMPLETED_TRANSACTION_STATUSES } },
      }),
      this.prisma.transaction.findMany({
        where: { ...where, status: { in: ACTIVE_TRANSACTION_STATUSES } },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        include: {
          offer: { select: { id: true, title: true, vendorLogo: true } },
        },
      }),
    ]);
    const counts = Object.fromEntries(
      active.map((row) => [row.status.toLowerCase(), row._count._all]),
    );
    const totalActive = active.reduce((sum, row) => sum + row._count._all, 0);

    return {
      totalActive,
      paid: counts.paid ?? 0,
      escrow: counts.escrow ?? 0,
      disputed: counts.disputed ?? 0,
      completed,
      recent,
    };
  }

  private loadRecentTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        offer: {
          select: {
            id: true,
            category: true,
            price: true,
            discountPercent: true,
          },
        },
      },
    });
  }

  private async loadEngagementSummary(
    userId: string,
  ): Promise<HomeEngagementSummary> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const [todayEvents, weekEvents, claimedMissionRows] = await Promise.all([
      this.prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: { userId, createdAt: { gte: startOfDay } },
        _count: { _all: true },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: { userId, createdAt: { gte: startOfWeek } },
        _count: { _all: true },
      }),
      this.prisma.analyticsEvent.findMany({
        where: {
          userId,
          eventType: { startsWith: DAILY_MISSION_CLAIMED_PREFIX },
          createdAt: { gte: startOfDay },
        },
        select: { eventType: true },
      }),
    ]);

    return {
      todayEvents: this.eventCountMap(todayEvents),
      weekEvents: this.eventCountMap(weekEvents),
      claimedMissionIds: new Set(
        claimedMissionRows.map((row) =>
          row.eventType.slice(DAILY_MISSION_CLAIMED_PREFIX.length),
        ),
      ),
    };
  }

  private async loadSquadProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { squad: { include: { members: true } } },
    });

    if (!user?.squad) return null;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const memberIds = user.squad.members.map((member) => member.id);
    const totalSpent = await this.prisma.transaction.aggregate({
      where: {
        buyerId: { in: memberIds },
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { price: true },
    });
    const currentSpending = totalSpent._sum.price ?? 0;

    return {
      squadId: user.squad.id,
      name: user.squad.name,
      inviteCode: user.squad.inviteCode,
      members: user.squad.members.map((member) => ({
        id: member.id,
        displayName: member.displayName,
        avatarUrl: member.avatarUrl,
      })),
      monthlyGoal: user.squad.monthlyGoal,
      currentSpending,
      isGoalReached: currentSpending >= user.squad.monthlyGoal,
      rewardTriggeredDate: user.squad.rewardTriggeredDate,
    };
  }

  private async loadSellerSummary(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [activeOffers, salesToday, revenueToday, unreadBuyerChats] =
      await Promise.all([
        this.prisma.offer.count({
          where: {
            sellerId: userId,
            isActive: true,
            moderationStatus: 'APPROVED',
          },
        }),
        this.prisma.transaction.count({
          where: {
            offer: { sellerId: userId },
            createdAt: { gte: startOfDay },
          },
        }),
        this.prisma.transaction.aggregate({
          where: {
            offer: { sellerId: userId },
            createdAt: { gte: startOfDay },
            status: { in: COMPLETED_TRANSACTION_STATUSES },
          },
          _sum: { price: true },
        }),
        this.prisma.message.count({
          where: {
            isRead: false,
            senderId: { not: userId },
            room: {
              participants: { some: { id: userId } },
              transaction: { offer: { sellerId: userId } },
            },
          },
        }),
      ]);

    if (activeOffers === 0 && salesToday === 0 && unreadBuyerChats === 0) {
      return null;
    }

    return {
      activeOffers,
      salesToday,
      revenueToday: revenueToday._sum.price ?? 0,
      unreadBuyerChats,
    };
  }

  private rankPersonalizedOffers(
    offers: HomeOfferWithSeller[],
    transactions: Array<{
      offerId: string;
      price: number;
      offer: { category: string | null; price: number } | null;
    }>,
  ) {
    if (transactions.length === 0) return offers.slice(0, 6);

    const purchasedIds = new Set(
      transactions.map((transaction) => transaction.offerId),
    );
    const categoryCounts = new Map<string, number>();
    for (const transaction of transactions) {
      const category = transaction.offer?.category;
      if (category)
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
    const averageSpend =
      transactions.reduce((sum, transaction) => sum + transaction.price, 0) /
      Math.max(transactions.length, 1);

    return offers
      .filter((offer) => !purchasedIds.has(offer.id))
      .map((offer) => {
        let score = categoryCounts.get(offer.category ?? '') ?? 1;
        if (offer.discountPercent && offer.discountPercent >= 15) score += 3;
        if (offer.isFlashDrop) score += 2;
        if (
          Math.abs(offer.price - averageSpend) <=
          Math.max(averageSpend * 0.35, 5)
        ) {
          score += 2;
        }
        return { offer, score };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 6)
      .map((item) => item.offer);
  }

  private rankTierOffers(offers: HomeOfferWithSeller[], tier: string) {
    return offers
      .map((offer) => {
        let score = 1;
        if (tier === 'PLATINUM' && offer.isExclusive) score += 5;
        if (
          tier === 'GOLD' &&
          offer.discountPercent &&
          offer.discountPercent >= 15
        )
          score += 4;
        if (tier === 'SILVER' && offer.price <= 15) score += 4;
        if (offer.featuredUntil && offer.featuredUntil > new Date()) score += 2;
        return { offer, score };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 6)
      .map((item) => item.offer);
  }

  private mapOfferItems(
    offers: HomeOfferWithSeller[],
    reason: string,
    geo: Required<HomeGeoQuery> | null,
  ) {
    return offers.map((offer) => {
      const distanceMeters = this.distanceMeters(
        geo,
        offer.latitude,
        offer.longitude,
      );
      const badges = this.offerBadges(offer, distanceMeters);

      return {
        offer,
        reason,
        score: this.offerScore(offer, distanceMeters),
        estimatedSavings: this.estimatedSavingsForOffer(offer),
        badges,
        urgencyScore: this.urgencyScore(offer),
        distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : null,
      };
    });
  }

  private buildSavingsSummary(
    transactions: HomeTransactionForSavings[],
    candidateOffers: HomeOfferWithSeller[],
  ) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const totalSaved = transactions.reduce(
      (sum, transaction) =>
        sum + this.estimatedSavingsForTransaction(transaction),
      0,
    );
    const monthlySaved = transactions
      .filter(
        (transaction) =>
          !transaction.createdAt || transaction.createdAt >= startOfMonth,
      )
      .reduce(
        (sum, transaction) =>
          sum + this.estimatedSavingsForTransaction(transaction),
        0,
      );
    const uniqueOffers = this.uniqueOffers(candidateOffers);
    const todayPotentialSavings = uniqueOffers
      .slice(0, 6)
      .reduce((sum, offer) => sum + this.estimatedSavingsForOffer(offer), 0);
    const expiringSavings = uniqueOffers
      .filter((offer) => {
        const hoursLeft = this.hoursLeft(offer.expiresAt);
        return hoursLeft !== null && hoursLeft <= 24;
      })
      .reduce((sum, offer) => sum + this.estimatedSavingsForOffer(offer), 0);
    const bestDealSavings = Math.max(
      0,
      ...uniqueOffers.map((offer) => this.estimatedSavingsForOffer(offer)),
    );

    return {
      totalSaved: this.roundMoney(totalSaved),
      monthlySaved: this.roundMoney(monthlySaved),
      todayPotentialSavings: this.roundMoney(todayPotentialSavings),
      expiringSavings: this.roundMoney(expiringSavings),
      bestDealSavings: this.roundMoney(bestDealSavings),
      savedFromDiscounts: this.roundMoney(totalSaved),
      savedFromPoints: 0,
    };
  }

  private buildPromoBanners(
    flashDrops: HomeOfferWithSeller[],
    nearbyOffers: HomeOfferWithSeller[],
    trendingOffers: HomeOfferWithSeller[],
    savingsSummary: ReturnType<HomeService['buildSavingsSummary']>,
  ) {
    const candidates = this.uniqueOffers([
      ...flashDrops,
      ...nearbyOffers,
      ...trendingOffers,
    ])
      .map((offer) => ({
        offer,
        estimatedSavings: this.estimatedSavingsForOffer(offer),
        priority:
          this.urgencyScore(offer) +
          (offer.discountPercent ?? 0) +
          (offer.isFlashDrop ? 30 : 0) +
          (offer.featuredUntil && offer.featuredUntil > new Date() ? 20 : 0),
      }))
      .sort((left, right) => right.priority - left.priority)
      .slice(0, 5);

    if (candidates.length === 0) {
      return [
        {
          id: 'daily-value',
          title: `До ${Math.round(savingsSummary.todayPotentialSavings).toLocaleString('ru-RU')} сум выгоды сегодня`,
          subtitle: 'Откройте подборку и заберите лучшие предложения дня',
          imageUrl:
            'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200&q=80',
          ctaTitle: 'Найти скидки',
          destinationType: 'catalog',
          destinationId: null,
          priority: 50,
          startsAt: null,
          endsAt: null,
          badge: 'выгода дня',
          estimatedSavings: savingsSummary.todayPotentialSavings,
          backgroundStyle: 'cyan',
        },
      ];
    }

    return candidates.map(({ offer, estimatedSavings, priority }, index) => ({
      id: `promo-${offer.id}`,
      title:
        estimatedSavings > 0
          ? `Сэкономьте ${Math.round(estimatedSavings).toLocaleString('ru-RU')} сум`
          : offer.discountPercent
            ? `-${offer.discountPercent}% сегодня`
            : offer.title,
      subtitle: offer.title,
      imageUrl:
        offer.vendorLogo ||
        'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200&q=80',
      ctaTitle: 'Забрать',
      destinationType: 'offer',
      destinationId: offer.id,
      priority: Math.round(priority),
      startsAt: offer.createdAt,
      endsAt: offer.expiresAt,
      badge: offer.isFlashDrop
        ? 'flash drop'
        : index === 0
          ? 'лучшее сегодня'
          : 'выгодно',
      estimatedSavings: this.roundMoney(estimatedSavings),
      backgroundStyle: index % 2 === 0 ? 'purple' : 'cyan',
    }));
  }

  private buildTrustSummary(
    activeTransactions: Awaited<
      ReturnType<HomeService['loadActiveTransactions']>
    > | null,
  ) {
    return {
      title: 'Покупки защищены',
      subtitle: 'Escrow держит оплату до подтверждения сделки',
      escrowActive: true,
      activeProtectedPurchases: activeTransactions?.totalActive ?? 0,
      disputed: activeTransactions?.disputed ?? 0,
    };
  }

  private buildStreakMultiplier(
    dailyBonus: Awaited<ReturnType<HomeService['loadDailyBonusStatus']>>,
  ) {
    const currentMultiplier = this.streakMultiplierValue(
      dailyBonus.currentStreak,
    );
    const nextMultiplier = this.streakMultiplierValue(
      dailyBonus.currentStreak + 1,
    );
    const nextMilestone = this.nextMultiplierMilestone(
      dailyBonus.currentStreak,
    );

    return {
      currentMultiplier,
      nextMultiplier,
      nextMilestoneDays: nextMilestone.days,
      nextMilestoneMultiplier: nextMilestone.multiplier,
      label: `x${currentMultiplier.toFixed(1)}`,
      description:
        currentMultiplier > 1
          ? `Ваш streak усиливает награды миссий на x${currentMultiplier.toFixed(1)}`
          : `Дойдите до ${nextMilestone.days} дней, чтобы включить x${nextMilestone.multiplier.toFixed(1)}`,
    };
  }

  private buildDailyMissions(input: {
    dailyBonus: Awaited<ReturnType<HomeService['loadDailyBonusStatus']>>;
    wheelStatus: Awaited<ReturnType<HomeService['loadWheelStatus']>>;
    transactions: HomeTransactionForSavings[];
    engagementSummary: HomeEngagementSummary;
    streakMultiplier: ReturnType<HomeService['buildStreakMultiplier']>;
  }) {
    const todayPurchases = this.todayPurchaseCount(input.transactions);
    const offerViews =
      input.engagementSummary.todayEvents.get('offer_view') ?? 0;
    const promoClicks =
      input.engagementSummary.todayEvents.get('promo_banner_click') ?? 0;
    const purchaseSuccess =
      input.engagementSummary.todayEvents.get('offer_purchase_success') ?? 0;
    const missionMultiplier = input.streakMultiplier.currentMultiplier;

    const missions = [
      {
        id: 'daily_bonus',
        title: 'Заберите ежедневный бонус',
        subtitle: input.dailyBonus.claimedToday
          ? 'Streak сохранён на сегодня'
          : `Сегодня доступно +${input.dailyBonus.todayReward.points} Points`,
        icon: 'gift.fill',
        tint: 'orange',
        progress: input.dailyBonus.claimedToday ? 1 : 0,
        goal: 1,
        rewardPoints: this.missionReward(10, missionMultiplier),
        destination: 'daily_bonus',
        priority: input.dailyBonus.claimedToday ? 50 : 120,
      },
      {
        id: 'spin_wheel',
        title: 'Крутите рулетку',
        subtitle:
          input.wheelStatus.spinsRemaining > 0
            ? `${input.wheelStatus.spinsRemaining} попытки ещё доступны`
            : 'Все попытки дня использованы',
        icon: 'dial.high.fill',
        tint: 'purple',
        progress: input.wheelStatus.spinsUsed,
        goal: input.wheelStatus.dailyLimit,
        rewardPoints: this.missionReward(20, missionMultiplier),
        destination: 'wheel',
        priority: input.wheelStatus.spinsRemaining > 0 ? 110 : 40,
      },
      {
        id: 'open_deals',
        title: 'Откройте 2 выгодных оффера',
        subtitle: 'Perkly быстрее поймёт ваши интересы',
        icon: 'sparkles',
        tint: 'cyan',
        progress: offerViews,
        goal: 2,
        rewardPoints: this.missionReward(25, missionMultiplier),
        destination: 'catalog',
        priority: offerViews >= 2 ? 45 : 90,
      },
      {
        id: 'catch_promo',
        title: 'Проверьте акцию дня',
        subtitle: 'Баннеры сверху обновляются по выгоде',
        icon: 'bolt.fill',
        tint: 'green',
        progress: promoClicks,
        goal: 1,
        rewardPoints: this.missionReward(15, missionMultiplier),
        destination: 'catalog',
        priority: promoClicks >= 1 ? 35 : 85,
      },
      {
        id: 'buy_deal',
        title: 'Заберите одну сделку',
        subtitle: 'Покупка в escrow закрывает миссию дня',
        icon: 'checkmark.seal.fill',
        tint: 'gold',
        progress: Math.max(todayPurchases, purchaseSuccess),
        goal: 1,
        rewardPoints: this.missionReward(80, missionMultiplier),
        destination: 'catalog',
        priority: todayPurchases > 0 || purchaseSuccess > 0 ? 60 : 70,
      },
    ];

    return missions.map((mission) => {
      const normalizedProgress = Math.min(mission.progress, mission.goal);
      const completed = normalizedProgress >= mission.goal;
      const claimed = input.engagementSummary.claimedMissionIds.has(mission.id);

      return {
        ...mission,
        progress: normalizedProgress,
        completed,
        claimed,
        claimable: completed && !claimed,
      };
    });
  }

  private buildLostSavings(
    dailyBonus: Awaited<ReturnType<HomeService['loadDailyBonusStatus']>> | null,
    wheelStatus: Awaited<ReturnType<HomeService['loadWheelStatus']>> | null,
    savingsSummary: ReturnType<HomeService['buildSavingsSummary']>,
    flashDrops: HomeOfferWithSeller[],
  ) {
    const lostPoints = dailyBonus?.canClaimToday
      ? dailyBonus.todayReward.points
      : 0;
    const wheelAttempts = wheelStatus?.spinsRemaining ?? 0;
    const pointsCashValue = lostPoints * REWARD_POINT_VALUE_UZS;
    const cashValue = this.roundMoney(
      savingsSummary.expiringSavings + pointsCashValue,
    );
    const expiringOffersCount = flashDrops.filter((offer) => {
      const hoursLeft = this.hoursLeft(offer.expiresAt);
      return hoursLeft !== null && hoursLeft <= 24;
    }).length;

    return {
      cashValue,
      expiringSavings: savingsSummary.expiringSavings,
      lostPoints,
      wheelAttempts,
      expiringOffersCount,
      title:
        cashValue > 0
          ? `Не потеряйте ${Math.round(cashValue).toLocaleString('ru-RU')} сум сегодня`
          : 'Сегодня всё под контролем',
      subtitle:
        cashValue > 0
          ? 'Сюда входят горящие акции и daily bonus'
          : 'Новые потери появятся, когда акции начнут истекать',
      resetAt: dailyBonus?.resetAt ?? wheelStatus?.resetAt ?? null,
    };
  }

  private buildWeeklyRecap(
    transactions: HomeTransactionForSavings[],
    engagementSummary: HomeEngagementSummary,
    dailyBonus: Awaited<ReturnType<HomeService['loadDailyBonusStatus']>>,
  ) {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const weekTransactions = transactions.filter(
      (transaction) =>
        transaction.createdAt !== undefined &&
        transaction.createdAt >= startOfWeek,
    );
    const savedThisWeek = weekTransactions.reduce(
      (sum, transaction) =>
        sum + this.estimatedSavingsForTransaction(transaction),
      0,
    );
    const categoryCounts = new Map<string, number>();
    for (const transaction of weekTransactions) {
      const category = transaction.offer?.category;
      if (category)
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
    const topCategory =
      Array.from(categoryCounts.entries()).sort(
        (left, right) => right[1] - left[1],
      )[0]?.[0] ?? null;

    return {
      savedThisWeek: this.roundMoney(savedThisWeek),
      purchasesThisWeek: weekTransactions.length,
      bonusesClaimed:
        engagementSummary.weekEvents.get(DAILY_BONUS_EVENT) ??
        engagementSummary.weekEvents.get('daily_bonus_claim') ??
        0,
      wheelSpins: engagementSummary.weekEvents.get('WHEEL_REWARD_CLAIMED') ?? 0,
      offerViews: engagementSummary.weekEvents.get('offer_view') ?? 0,
      streakDays: dailyBonus.currentStreak,
      topCategory,
      message:
        savedThisWeek > 0
          ? `За 7 дней Perkly сохранил вам ${Math.round(this.roundMoney(savedThisWeek)).toLocaleString('ru-RU')} сум`
          : 'Начните неделю с первого bonus claim и flash drop',
    };
  }

  private publicPriorityActions(
    flashDrops: HomeOfferWithSeller[],
    nearbyOffers: HomeOfferWithSeller[],
    upcomingEvents: Array<{ event: unknown }>,
    savingsSummary: ReturnType<HomeService['buildSavingsSummary']>,
  ) {
    return [
      {
        id: 'discover',
        type: 'catalog',
        title: 'Сэкономить',
        subtitle: 'Лучшие акции дня уже собраны',
        value: `${Math.round(savingsSummary.todayPotentialSavings).toLocaleString('ru-RU')} сум`,
        icon: 'sparkles',
        tint: 'purple',
        destination: 'catalog',
        priority: 90,
      },
      {
        id: 'flash',
        type: 'flash',
        title: 'Горит',
        subtitle: `${flashDrops.length || 'Новые'} flash drops ждут`,
        value: `${flashDrops.length}`,
        icon: 'flame.fill',
        tint: 'orange',
        destination: 'catalog',
        priority: 85,
      },
      {
        id: 'nearby',
        type: 'nearby',
        title: 'Рядом',
        subtitle:
          nearbyOffers.length > 0
            ? 'Есть предложения поблизости'
            : 'Включите гео',
        value: `${nearbyOffers.length}`,
        icon: 'location.fill',
        tint: 'cyan',
        destination: 'nearby',
        priority: 70,
      },
      {
        id: 'events',
        type: 'events',
        title: 'События',
        subtitle: 'Topka и городские активности',
        value: `${upcomingEvents.length}`,
        icon: 'calendar',
        tint: 'orange',
        destination: 'events',
        priority: 50,
      },
    ];
  }

  private privatePriorityActions(input: {
    dailyBonus: Awaited<ReturnType<HomeService['loadDailyBonusStatus']>>;
    savingsSummary: ReturnType<HomeService['buildSavingsSummary']>;
    wheelStatus: Awaited<ReturnType<HomeService['loadWheelStatus']>>;
    unreadChats: Awaited<ReturnType<HomeService['loadUnreadChats']>>;
    activeTransactions: Awaited<
      ReturnType<HomeService['loadActiveTransactions']>
    >;
    flashDrops: HomeOfferWithSeller[];
    nearbyOffers: HomeOfferWithSeller[];
    upcomingEvents: Array<{ event: unknown }>;
    squadProgress: Awaited<ReturnType<HomeService['loadSquadProgress']>>;
    dailyMissions: ReturnType<HomeService['buildDailyMissions']>;
    lostSavings: ReturnType<HomeService['buildLostSavings']>;
  }) {
    const claimableMissions = input.dailyMissions.filter(
      (mission) => mission.claimable,
    );
    const actions = [
      {
        id: 'lost-savings',
        type: 'lost_savings',
        title:
          input.lostSavings.cashValue > 0
            ? 'Не потеряйте'
            : 'Выгода под контролем',
        subtitle: input.lostSavings.subtitle,
        value: `${Math.round(input.lostSavings.cashValue).toLocaleString('ru-RU')} сум`,
        icon: 'exclamationmark.triangle.fill',
        tint: input.lostSavings.cashValue > 0 ? 'red' : 'green',
        destination: 'catalog',
        priority: input.lostSavings.cashValue > 0 ? 125 : 30,
      },
      {
        id: 'daily-bonus',
        type: 'daily_bonus',
        title: input.dailyBonus.canClaimToday
          ? 'Забрать бонус'
          : `${input.dailyBonus.currentStreak} дней streak`,
        subtitle: input.dailyBonus.canClaimToday
          ? `Сегодня +${input.dailyBonus.todayReward.points} Points`
          : `Завтра ${input.dailyBonus.nextReward.label}`,
        value: input.dailyBonus.canClaimToday
          ? `+${input.dailyBonus.todayReward.points}`
          : `${input.dailyBonus.currentStreak}`,
        icon: 'flame.fill',
        tint: 'orange',
        destination: 'daily_bonus',
        priority: input.dailyBonus.canClaimToday ? 120 : 76,
      },
      {
        id: 'missions',
        type: 'missions',
        title: claimableMissions.length > 0 ? 'Миссии готовы' : 'Миссии дня',
        subtitle:
          claimableMissions.length > 0
            ? `${claimableMissions.length} награды можно забрать`
            : 'Закройте задачи и усилите streak',
        value: `${input.dailyMissions.filter((mission) => mission.completed).length}/${input.dailyMissions.length}`,
        icon: 'target',
        tint: 'cyan',
        destination: 'missions',
        priority: claimableMissions.length > 0 ? 118 : 82,
      },
      {
        id: 'savings',
        type: 'savings',
        title: 'Экономия дня',
        subtitle:
          input.savingsSummary.todayPotentialSavings > 0
            ? 'Можно забрать сегодня'
            : 'Новые выгоды уже в подборке',
        value: `${Math.round(input.savingsSummary.todayPotentialSavings).toLocaleString('ru-RU')} сум`,
        icon: 'arrow.down.circle.fill',
        tint: 'green',
        destination: 'catalog',
        priority: input.savingsSummary.todayPotentialSavings > 0 ? 110 : 40,
      },
      {
        id: 'wheel',
        type: 'wheel',
        title:
          input.wheelStatus.spinsRemaining > 0
            ? 'Забрать бонус'
            : 'Бонус завтра',
        subtitle: `${input.wheelStatus.spinsRemaining}/${input.wheelStatus.dailyLimit} попытки сегодня`,
        value: `${input.wheelStatus.spinsRemaining}/${input.wheelStatus.dailyLimit}`,
        icon: 'gift.fill',
        tint: 'purple',
        destination: 'wheel',
        priority: input.wheelStatus.spinsRemaining > 0 ? 100 : 20,
      },
      {
        id: 'flash',
        type: 'flash',
        title: 'Горит',
        subtitle:
          input.flashDrops.length > 0
            ? 'Акции скоро исчезнут'
            : 'Ждём новые flash drops',
        value: `${input.flashDrops.length}`,
        icon: 'bolt.fill',
        tint: 'orange',
        destination: 'catalog',
        priority: input.flashDrops.length > 0 ? 92 : 18,
      },
      {
        id: 'chat',
        type: 'chat',
        title: input.unreadChats.totalUnread > 0 ? 'Ответить' : 'Чаты',
        subtitle:
          input.unreadChats.totalUnread > 0
            ? `${input.unreadChats.rooms} диалогов ждут`
            : 'Новых сообщений нет',
        value: `${input.unreadChats.totalUnread}`,
        icon: 'message.fill',
        tint: 'cyan',
        destination: 'chat',
        priority: input.unreadChats.totalUnread > 0 ? 95 : 25,
      },
      {
        id: 'transactions',
        type: 'transactions',
        title:
          input.activeTransactions.totalActive > 0
            ? 'Проверить заказ'
            : 'Сделки защищены',
        subtitle:
          input.activeTransactions.totalActive > 0
            ? `${input.activeTransactions.totalActive} активных`
            : 'Escrow включён',
        value: `${input.activeTransactions.totalActive}`,
        icon: 'lock.shield.fill',
        tint: 'green',
        destination: 'transactions',
        priority: input.activeTransactions.totalActive > 0 ? 90 : 35,
      },
      {
        id: 'nearby',
        type: 'nearby',
        title: 'Рядом',
        subtitle:
          input.nearbyOffers.length > 0 ? 'Лучшее вокруг вас' : 'Включите гео',
        value: `${input.nearbyOffers.length}`,
        icon: 'location.fill',
        tint: 'orange',
        destination: 'nearby',
        priority: input.nearbyOffers.length > 0 ? 78 : 15,
      },
    ];

    if (input.squadProgress) {
      actions.push({
        id: 'squad',
        type: 'squad',
        title: input.squadProgress.name,
        subtitle: 'Прогресс squad',
        value: `${Math.round(
          (input.squadProgress.currentSpending /
            input.squadProgress.monthlyGoal) *
            100,
        )}%`,
        icon: 'person.3.fill',
        tint: 'cyan',
        destination: 'squad',
        priority: input.squadProgress.isGoalReached ? 88 : 60,
      });
    }

    if (input.upcomingEvents.length > 0) {
      actions.push({
        id: 'events',
        type: 'events',
        title: 'События',
        subtitle: 'На этой неделе',
        value: `${input.upcomingEvents.length}`,
        icon: 'calendar',
        tint: 'purple',
        destination: 'events',
        priority: 40,
      });
    }

    return actions
      .sort((left, right) => right.priority - left.priority)
      .slice(0, 8);
  }

  private eventCountMap(
    rows: Array<{ eventType: string; _count: { _all: number } }>,
  ) {
    return new Map(rows.map((row) => [row.eventType, row._count._all]));
  }

  private todayPurchaseCount(transactions: HomeTransactionForSavings[]) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return transactions.filter(
      (transaction) =>
        transaction.createdAt !== undefined &&
        transaction.createdAt >= startOfDay &&
        (!transaction.status ||
          COMPLETED_TRANSACTION_STATUSES.includes(transaction.status)),
    ).length;
  }

  private missionReward(baseReward: number, multiplier: number) {
    return Math.round(baseReward * multiplier);
  }

  private streakMultiplierValue(streakDays: number) {
    if (streakDays >= 7) return 2;
    if (streakDays >= 5) return 1.5;
    if (streakDays >= 3) return 1.2;
    return 1;
  }

  private nextMultiplierMilestone(streakDays: number) {
    if (streakDays < 3) return { days: 3, multiplier: 1.2 };
    if (streakDays < 5) return { days: 5, multiplier: 1.5 };
    if (streakDays < 7) return { days: 7, multiplier: 2 };
    return { days: streakDays + 1, multiplier: 2 };
  }

  private offerBadges(
    offer: HomeOfferWithSeller,
    distanceMeters: number,
  ): HomeBadge[] {
    const badges: HomeBadge[] = [];
    if (Number.isFinite(distanceMeters)) {
      badges.push({
        text: this.distanceLabel(distanceMeters),
        style: 'distance',
      });
    }
    const hoursLeft = this.hoursLeft(offer.expiresAt);
    if (hoursLeft !== null && hoursLeft <= 72) {
      badges.push({
        text: hoursLeft < 1 ? 'до 1ч' : `${Math.ceil(hoursLeft)}ч`,
        style: 'urgency',
      });
    }
    if (offer.discountPercent && offer.discountPercent > 0) {
      badges.push({ text: `-${offer.discountPercent}%`, style: 'status' });
    }
    if (offer.isExclusive) {
      badges.push({ text: 'exclusive', style: 'tier' });
    }
    return badges.slice(0, 3);
  }

  private eventBadges(date: Date, participantsCount: number) {
    const badges: HomeBadge[] = [];
    const now = new Date();
    const diffDays = Math.floor(
      (date.getTime() -
        new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
        86_400_000,
    );
    if (diffDays === 0) badges.push({ text: 'сегодня', style: 'urgency' });
    if (diffDays > 0 && diffDays <= 7)
      badges.push({ text: 'на неделе', style: 'status' });
    if (participantsCount >= 500)
      badges.push({ text: 'популярно', style: 'tier' });
    return badges;
  }

  private offerScore(offer: HomeOfferWithSeller, distanceMeters: number) {
    let score = 10;
    if (offer.isFlashDrop) score += 18;
    if (offer.discountPercent) score += Math.min(offer.discountPercent, 40);
    if (offer.isExclusive) score += 10;
    if (offer.featuredUntil && offer.featuredUntil > new Date()) score += 12;
    if (Number.isFinite(distanceMeters))
      score += Math.max(0, 12 - distanceMeters / 500);
    return Math.round(score);
  }

  private estimatedSavingsForOffer(offer: {
    price: number;
    discountPercent: number | null;
  }) {
    const discount = offer.discountPercent ?? 0;
    if (discount <= 0 || discount >= 100) return 0;
    const originalPrice = offer.price / (1 - discount / 100);
    return this.roundMoney(Math.max(0, originalPrice - offer.price));
  }

  private estimatedSavingsForTransaction(transaction: {
    price: number;
    offer?: { discountPercent?: number | null; price?: number | null } | null;
  }) {
    const discount = transaction.offer?.discountPercent ?? 0;
    if (discount <= 0 || discount >= 100) return 0;
    const originalPrice = transaction.price / (1 - discount / 100);
    return this.roundMoney(Math.max(0, originalPrice - transaction.price));
  }

  private uniqueOffers(offers: HomeOfferWithSeller[]) {
    const seen = new Set<string>();
    const result: HomeOfferWithSeller[] = [];
    for (const offer of offers) {
      if (seen.has(offer.id)) continue;
      seen.add(offer.id);
      result.push(offer);
    }
    return result;
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private dailyBonusReward(streakDay: number) {
    if (streakDay >= 7) return { points: 120, label: 'x2 streak bonus' };
    if (streakDay >= 5) return { points: 80, label: 'Mega streak' };
    if (streakDay >= 3) return { points: 50, label: 'Streak boost' };
    return { points: 25, label: 'Daily bonus' };
  }

  private weekProgress(today: Date, claimedDays: Set<string>) {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));

      return {
        day: this.dayKey(day),
        label: day.toLocaleDateString('ru-RU', { weekday: 'short' }),
        claimed: claimedDays.has(this.dayKey(day)),
        reward: this.dailyBonusReward(index + 1),
      };
    });
  }

  private countStreak(claimedDays: Set<string>, fromDate: Date) {
    let streak = 0;
    const cursor = new Date(fromDate);
    while (claimedDays.has(this.dayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  private longestStreak(claimedDays: Set<string>) {
    const sortedDays = Array.from(claimedDays).sort();
    let longest = 0;
    let current = 0;
    let previous: Date | null = null;

    for (const dayKey of sortedDays) {
      const date = new Date(`${dayKey}T00:00:00.000Z`);
      if (
        previous &&
        Math.round((date.getTime() - previous.getTime()) / 86_400_000) === 1
      ) {
        current += 1;
      } else {
        current = 1;
      }
      longest = Math.max(longest, current);
      previous = date;
    }

    return longest;
  }

  private urgencyScore(offer: HomeOfferWithSeller) {
    const hoursLeft = this.hoursLeft(offer.expiresAt);
    if (hoursLeft === null) return 0;
    if (hoursLeft <= 1) return 100;
    if (hoursLeft <= 6) return 80;
    if (hoursLeft <= 24) return 55;
    if (hoursLeft <= 72) return 30;
    return 0;
  }

  private hoursLeft(expiresAt: Date | null) {
    if (!expiresAt) return null;
    return Math.max(0, (expiresAt.getTime() - Date.now()) / 3_600_000);
  }

  private normalizeGeo(geo: HomeGeoQuery): Required<HomeGeoQuery> | null {
    if (
      geo.lat === undefined ||
      geo.lng === undefined ||
      !Number.isFinite(geo.lat) ||
      !Number.isFinite(geo.lng)
    ) {
      return null;
    }

    return {
      lat: geo.lat,
      lng: geo.lng,
      radiusKm:
        geo.radiusKm !== undefined && Number.isFinite(geo.radiusKm)
          ? Math.min(Math.max(geo.radiusKm, 1), 25)
          : 5,
    };
  }

  private distanceMeters(
    geo: Required<HomeGeoQuery> | null,
    lat: number | null,
    lng: number | null,
  ) {
    if (!geo || lat === null || lng === null) return Number.POSITIVE_INFINITY;
    const earthRadiusMeters = 6_371_000;
    const lat1 = (geo.lat * Math.PI) / 180;
    const lat2 = (lat * Math.PI) / 180;
    const deltaLat = ((lat - geo.lat) * Math.PI) / 180;
    const deltaLng = ((lng - geo.lng) * Math.PI) / 180;
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);
    return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private distanceLabel(distanceMeters: number) {
    if (distanceMeters < 1000) return `${Math.round(distanceMeters)} м`;
    return `${(distanceMeters / 1000).toFixed(1)} км`;
  }

  private dayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
