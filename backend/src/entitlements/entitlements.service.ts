import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Subscription } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type TierName = 'SILVER' | 'GOLD' | 'PLATINUM';
export type SubscriptionStatus = 'NONE' | 'ACTIVE' | 'EXPIRED' | 'CANCELED';

export interface CapabilitySet {
  canCreateOffers: boolean;
  canFeatureOffers: boolean;
  canPublishTopka: boolean;
  canViewBasicAnalytics: boolean;
  canViewAdvancedAnalytics: boolean;
  hasPrioritySupport: boolean;
}

export interface PartnerCapabilities {
  userId: string;
  role: string;
  tier: TierName;
  planName: string;
  status: SubscriptionStatus;
  isActive: boolean;
  currentSubscription: SubscriptionSummary | null;
  daysRemaining: number | null;
  capabilities: CapabilitySet;
  limits: {
    offersLimit: number;
    topkaMonthlyLimit: number;
    featuredOffersPerMonth: number;
  };
  usage: {
    activeOffers: number;
    activeEvents: number;
    topkaPublishedThisMonth: number;
  };
  upgrade: {
    requiredTier: TierName;
    reason: string;
    ctaTitle: string;
  } | null;
  plans: PlanSummary[];
}

export interface SubscriptionSummary {
  id: string;
  tier: TierName;
  status: SubscriptionStatus;
  startsAt: string;
  endsAt: string;
  daysRemaining: number | null;
  autoRenew: boolean;
  provider: 'MOCK';
}

export interface PlanSummary {
  tier: TierName;
  displayName: string;
  priceMonthly: number;
  recommended: boolean;
  benefits: string[];
  capabilities: CapabilitySet;
  limits: {
    offersLimit: number;
    topkaMonthlyLimit: number;
    featuredOffersPerMonth: number;
  };
}

const PLAN_NAMES: Record<TierName, string> = {
  SILVER: 'Basic',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
};

const PLAN_PRICES: Record<TierName, number> = {
  SILVER: 0,
  GOLD: 4.99,
  PLATINUM: 9.99,
};

const PLAN_LIMITS: Record<
  TierName,
  {
    offersLimit: number;
    topkaMonthlyLimit: number;
    featuredOffersPerMonth: number;
  }
> = {
  SILVER: {
    offersLimit: 3,
    topkaMonthlyLimit: 0,
    featuredOffersPerMonth: 0,
  },
  GOLD: {
    offersLimit: 20,
    topkaMonthlyLimit: 0,
    featuredOffersPerMonth: 3,
  },
  PLATINUM: {
    offersLimit: -1,
    topkaMonthlyLimit: 30,
    featuredOffersPerMonth: 10,
  },
};

const PLAN_BENEFITS: Record<TierName, string[]> = {
  SILVER: [
    'Базовая витрина офферов',
    'Статистика продаж',
    'До 3 активных офферов',
  ],
  GOLD: [
    'До 20 активных офферов',
    'Продвижение офферов',
    'Расширенная статистика',
    'Приоритетная поддержка',
  ],
  PLATINUM: [
    'Публикации в Topka',
    'До 30 событий в месяц',
    'Максимальная аналитика',
    'Приоритет в городских подборках',
  ],
};

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPartnerCapabilities(userId: string): Promise<PartnerCapabilities> {
    const entitlement = await this.getEffectiveEntitlement(userId);
    const limits = PLAN_LIMITS[entitlement.tier];
    const capabilities = this.capabilitiesForTier(entitlement.tier);
    const monthStart = this.startOfMonth(new Date());

    const [activeOffers, activeEvents, topkaPublishedThisMonth] =
      await Promise.all([
        this.prisma.offer.count({
          where: { sellerId: userId, isActive: true },
        }),
        this.prisma.event.count({
          where: { organizerId: userId },
        }),
        this.prisma.event.count({
          where: { organizerId: userId, createdAt: { gte: monthStart } },
        }),
      ]);

    const topkaLimitReached =
      limits.topkaMonthlyLimit >= 0 &&
      topkaPublishedThisMonth >= limits.topkaMonthlyLimit;

    const canPublishTopka = capabilities.canPublishTopka && !topkaLimitReached;

    return {
      userId,
      role: entitlement.role,
      tier: entitlement.tier,
      planName: PLAN_NAMES[entitlement.tier],
      status: entitlement.status,
      isActive: entitlement.status === 'ACTIVE',
      currentSubscription: entitlement.currentSubscription,
      daysRemaining: entitlement.currentSubscription?.daysRemaining ?? null,
      capabilities: {
        ...capabilities,
        canPublishTopka,
      },
      limits,
      usage: {
        activeOffers,
        activeEvents,
        topkaPublishedThisMonth,
      },
      upgrade: this.upgradeReason(entitlement.tier, topkaLimitReached),
      plans: this.planSummaries(),
    };
  }

  async canPublishTopka(userId: string): Promise<boolean> {
    const capabilities = await this.getPartnerCapabilities(userId);
    return capabilities.capabilities.canPublishTopka;
  }

  async getEffectiveEntitlement(userId: string): Promise<{
    role: string;
    tier: TierName;
    status: SubscriptionStatus;
    currentSubscription: SubscriptionSummary | null;
  }> {
    await this.expireUserSubscriptions(userId);
    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, tier: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [activeSubscription, latestSubscription] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: {
          userId,
          isActive: true,
          endDate: { gt: now },
        },
        orderBy: { endDate: 'desc' },
      }),
      this.prisma.subscription.findFirst({
        where: { userId },
        orderBy: { endDate: 'desc' },
      }),
    ]);

    let tier: TierName = 'SILVER';
    let status: SubscriptionStatus = 'NONE';

    if (user.role === 'ADMIN') {
      tier = 'PLATINUM';
      status = 'ACTIVE';
    } else if (activeSubscription) {
      tier = this.normalizeTier(activeSubscription.tier);
      status = 'ACTIVE';
    } else if (latestSubscription) {
      status = this.subscriptionStatus(latestSubscription, now);
    }

    if (user.role !== 'ADMIN' && this.normalizeTier(user.tier) !== tier) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { tier },
      });
    }

    return {
      role: user.role,
      tier,
      status,
      currentSubscription: latestSubscription
        ? this.subscriptionSummary(latestSubscription, now)
        : null,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireSubscriptions(): Promise<void> {
    const expired = await this.prisma.subscription.findMany({
      where: { isActive: true, endDate: { lte: new Date() } },
      select: { userId: true },
    });
    if (expired.length === 0) return;

    const affectedUserIds = [...new Set(expired.map((item) => item.userId))];

    await this.prisma.subscription.updateMany({
      where: { isActive: true, endDate: { lte: new Date() } },
      data: { isActive: false },
    });

    await Promise.all(
      affectedUserIds.map(async (affectedUserId) => {
        const active = await this.prisma.subscription.findFirst({
          where: {
            userId: affectedUserId,
            isActive: true,
            endDate: { gt: new Date() },
          },
        });
        if (active) return;

        await this.prisma.user.updateMany({
          where: { id: affectedUserId, role: { not: 'ADMIN' } },
          data: { tier: 'SILVER' },
        });
      }),
    );

    this.logger.log(
      `Expired subscriptions for ${affectedUserIds.length} users`,
    );
  }

  private async expireUserSubscriptions(userId: string): Promise<void> {
    await this.prisma.subscription.updateMany({
      where: { userId, isActive: true, endDate: { lte: new Date() } },
      data: { isActive: false },
    });
  }

  private capabilitiesForTier(tier: TierName): CapabilitySet {
    switch (tier) {
      case 'PLATINUM':
        return {
          canCreateOffers: true,
          canFeatureOffers: true,
          canPublishTopka: true,
          canViewBasicAnalytics: true,
          canViewAdvancedAnalytics: true,
          hasPrioritySupport: true,
        };
      case 'GOLD':
        return {
          canCreateOffers: true,
          canFeatureOffers: true,
          canPublishTopka: false,
          canViewBasicAnalytics: true,
          canViewAdvancedAnalytics: true,
          hasPrioritySupport: true,
        };
      case 'SILVER':
        return {
          canCreateOffers: true,
          canFeatureOffers: false,
          canPublishTopka: false,
          canViewBasicAnalytics: true,
          canViewAdvancedAnalytics: false,
          hasPrioritySupport: false,
        };
    }
  }

  private planSummaries(): PlanSummary[] {
    return (['SILVER', 'GOLD', 'PLATINUM'] as TierName[]).map((tier) => ({
      tier,
      displayName: PLAN_NAMES[tier],
      priceMonthly: PLAN_PRICES[tier],
      recommended: tier === 'GOLD',
      benefits: PLAN_BENEFITS[tier],
      capabilities: this.capabilitiesForTier(tier),
      limits: PLAN_LIMITS[tier],
    }));
  }

  private upgradeReason(
    tier: TierName,
    topkaLimitReached: boolean,
  ): PartnerCapabilities['upgrade'] {
    if (tier === 'PLATINUM' && topkaLimitReached) {
      return {
        requiredTier: 'PLATINUM',
        reason: 'Месячный лимит публикаций Topka исчерпан',
        ctaTitle: 'Лимит Topka',
      };
    }

    if (tier !== 'PLATINUM') {
      return {
        requiredTier: 'PLATINUM',
        reason: 'Публикации в Topka доступны на Platinum',
        ctaTitle: 'Перейти на Platinum',
      };
    }

    return null;
  }

  private subscriptionSummary(
    subscription: Subscription,
    now = new Date(),
  ): SubscriptionSummary {
    const isExpired = subscription.endDate <= now;

    return {
      id: subscription.id,
      tier: this.normalizeTier(subscription.tier),
      status: this.subscriptionStatus(subscription, now),
      startsAt: subscription.startDate.toISOString(),
      endsAt: subscription.endDate.toISOString(),
      daysRemaining: isExpired
        ? 0
        : Math.ceil(
            (subscription.endDate.getTime() - now.getTime()) / 86_400_000,
          ),
      autoRenew: false,
      provider: 'MOCK',
    };
  }

  private subscriptionStatus(
    subscription: Subscription,
    now = new Date(),
  ): SubscriptionStatus {
    if (subscription.endDate <= now) return 'EXPIRED';
    return subscription.isActive ? 'ACTIVE' : 'CANCELED';
  }

  private normalizeTier(value?: string | null): TierName {
    if (value === 'GOLD' || value === 'PLATINUM') return value;
    return 'SILVER';
  }

  private startOfMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
}
