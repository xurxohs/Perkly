import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { SavedOffer, SAVED_OFFER_SELECT } from '../offers/offer.selects';

export const SUBSCRIPTION_PRICES: Record<string, number> = {
  GOLD: 4.99,
  PLATINUM: 9.99,
};

const DAILY_WHEEL_LIMIT = 3;
const DAILY_BONUS_EVENT = 'DAILY_BONUS_CLAIMED';
const DAILY_MISSION_CLAIMED_PREFIX = 'DAILY_MISSION_CLAIMED:';

type WheelReward = {
  label: string;
  points: number;
  weight: number;
  message: string;
};

type DailyBonusReward = {
  points: number;
  label: string;
};

type DailyMission = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  tint: string;
  progress: number;
  goal: number;
  rewardPoints: number;
  destination: string;
  priority: number;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
};

const WHEEL_REWARDS: WheelReward[] = [
  {
    label: '25 Points',
    points: 25,
    weight: 30,
    message: 'Начислено 25 Perkly Points',
  },
  {
    label: '50 Points',
    points: 50,
    weight: 24,
    message: 'Начислено 50 Perkly Points',
  },
  {
    label: '75 Points',
    points: 75,
    weight: 18,
    message: 'Начислено 75 Perkly Points',
  },
  {
    label: '100 Points',
    points: 100,
    weight: 12,
    message: 'Начислено 100 Perkly Points',
  },
  {
    label: '150 Points',
    points: 150,
    weight: 7,
    message: 'Начислено 150 Perkly Points',
  },
  {
    label: '200 Points',
    points: 200,
    weight: 4,
    message: 'Начислено 200 Perkly Points',
  },
  {
    label: '300 Points',
    points: 300,
    weight: 1,
    message: 'Джекпот! Начислено 300 Perkly Points',
  },
  {
    label: 'Попробуйте ещё',
    points: 0,
    weight: 4,
    message: 'В этот раз без выигрыша. Если попытки остались, попробуйте ещё.',
  },
];

const USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  tier: true,
  balance: true,
  rewardPoints: true,
  createdAt: true,
  updatedAt: true,
  telegramId: true,
  phone: true,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private entitlements: EntitlementsService,
  ) {}

  async findById(id: string) {
    await this.entitlements.getEffectiveEntitlement(id);

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(
    id: string,
    data: { displayName?: string; avatarUrl?: string },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  async getStats(userId: string) {
    const [totalSpent, totalPurchases, reviewsCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { buyerId: userId },
        _sum: { price: true },
      }),
      this.prisma.transaction.count({ where: { buyerId: userId } }),
      this.prisma.review.count({ where: { authorId: userId } }),
    ]);

    return {
      totalSpent: totalSpent._sum.price ?? 0,
      totalPurchases,
      reviewsCount,
    };
  }

  listSavedOffers(userId: string): Promise<SavedOffer[]> {
    return this.prisma.savedOffer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: SAVED_OFFER_SELECT,
    });
  }

  async subscribe(userId: string, tier: 'GOLD' | 'PLATINUM', months: number) {
    if (months < 1 || months > 12) {
      throw new BadRequestException('Months must be between 1 and 12');
    }

    const pricePerMonth = SUBSCRIPTION_PRICES[tier];
    if (!pricePerMonth) {
      throw new BadRequestException('Invalid tier. Choose GOLD or PLATINUM');
    }
    const cost = pricePerMonth * months;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.balance < cost) {
      throw new BadRequestException(
        `Insufficient balance. Need $${cost.toFixed(2)}, have $${user.balance.toFixed(2)}`,
      );
    }

    await this.entitlements.getEffectiveEntitlement(userId);

    const now = new Date();
    const currentSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        endDate: { gt: now },
      },
      orderBy: { endDate: 'desc' },
    });
    const baseEndDate =
      currentSubscription?.tier === tier && currentSubscription.endDate > now
        ? currentSubscription.endDate
        : now;
    const endDate = new Date(baseEndDate.getTime() + months * 30 * 86400_000);

    // Deactivate any existing active subscriptions
    await this.prisma.subscription.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    const [subscription] = await Promise.all([
      this.prisma.subscription.create({
        data: { userId, tier, startDate: now, endDate, isActive: true },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: cost }, tier },
      }),
    ]);

    return {
      subscription,
      tier,
      status: 'ACTIVE',
      startsAt: now,
      endDate,
      cost,
      autoRenew: false,
      provider: 'MOCK',
    };
  }

  async getWheelStatus(userId: string) {
    await this.ensureUserExists(userId);

    const { startOfDay, nextResetAt } = this.getWheelWindow();
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

  async spinWheel(userId: string) {
    const status = await this.getWheelStatus(userId);
    if (!status.canSpin) {
      throw new BadRequestException(
        'Лимит попыток на сегодня исчерпан. Возвращайтесь после ежедневного обновления.',
      );
    }

    const reward = this.pickWheelReward();
    const user =
      reward.points > 0
        ? await this.prisma.user.update({
            where: { id: userId },
            data: {
              rewardPoints: {
                increment: reward.points,
              },
            },
            select: USER_SELECT,
          })
        : await this.findById(userId);

    await this.prisma.analyticsEvent.create({
      data: {
        eventType: 'WHEEL_REWARD_CLAIMED',
        userId,
        metadata: JSON.stringify({
          reward: reward.label,
          points: reward.points,
        }),
      },
    });

    return {
      success: true,
      message: reward.message,
      reward: reward.label,
      points: reward.points,
      newRewardPoints: user.rewardPoints,
      newBalance: user.balance,
      dailyLimit: DAILY_WHEEL_LIMIT,
      spinsUsed: status.spinsUsed + 1,
      spinsRemaining: Math.max(0, DAILY_WHEEL_LIMIT - (status.spinsUsed + 1)),
      resetAt: status.resetAt,
    };
  }

  async claimWheelReward(userId: string, _reward?: string) {
    return this.spinWheel(userId);
  }

  async getDailyBonusStatus(userId: string) {
    await this.ensureUserExists(userId);
    return this.buildDailyBonusStatus(userId);
  }

  async claimDailyBonus(userId: string) {
    await this.ensureUserExists(userId);
    const status = await this.buildDailyBonusStatus(userId);

    if (!status.canClaimToday) {
      throw new BadRequestException('Daily bonus already claimed today');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          rewardPoints: {
            increment: status.todayReward.points,
          },
        },
      }),
      this.prisma.analyticsEvent.create({
        data: {
          eventType: DAILY_BONUS_EVENT,
          userId,
          metadata: JSON.stringify({
            reward: status.todayReward,
            streakAfterClaim: status.currentStreak + 1,
          }),
        },
      }),
    ]);

    const updatedStatus = await this.buildDailyBonusStatus(userId);
    return {
      success: true,
      message: `Начислено ${status.todayReward.points} Perkly Points`,
      reward: status.todayReward,
      status: updatedStatus,
    };
  }

  async getDailyMissions(userId: string) {
    await this.ensureUserExists(userId);
    return this.buildDailyMissions(userId);
  }

  async claimDailyMission(userId: string, missionId: string) {
    await this.ensureUserExists(userId);
    const missions = await this.buildDailyMissions(userId);
    const mission = missions.find((item) => item.id === missionId);

    if (!mission) {
      throw new BadRequestException('Unknown daily mission');
    }
    if (!mission.completed) {
      throw new BadRequestException('Daily mission is not completed yet');
    }
    if (mission.claimed) {
      throw new BadRequestException('Daily mission already claimed today');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          rewardPoints: {
            increment: mission.rewardPoints,
          },
        },
        select: USER_SELECT,
      });
      await tx.analyticsEvent.create({
        data: {
          eventType: `${DAILY_MISSION_CLAIMED_PREFIX}${mission.id}`,
          userId,
          metadata: JSON.stringify({
            rewardPoints: mission.rewardPoints,
            title: mission.title,
          }),
        },
      });
      return updatedUser;
    });

    return {
      success: true,
      message: `Начислено ${mission.rewardPoints} Perkly Points`,
      rewardPoints: mission.rewardPoints,
      missionId: mission.id,
      user,
      missions: await this.buildDailyMissions(userId),
    };
  }

  private async buildDailyMissions(userId: string): Promise<DailyMission[]> {
    const { startOfDay } = this.getWheelWindow();
    const [dailyBonus, wheelStatus, eventRows, todayPurchases, claimedRows] =
      await Promise.all([
        this.buildDailyBonusStatus(userId),
        this.getWheelStatus(userId),
        this.prisma.analyticsEvent.groupBy({
          by: ['eventType'],
          where: { userId, createdAt: { gte: startOfDay } },
          _count: { _all: true },
        }),
        this.prisma.transaction.count({
          where: {
            buyerId: userId,
            createdAt: { gte: startOfDay },
            status: { in: ['COMPLETED', 'SUCCESS', 'ACTIVATED'] },
          },
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
    const eventCounts = new Map(
      eventRows.map((row) => [row.eventType, row._count._all]),
    );
    const claimedIds = new Set(
      claimedRows.map((row) =>
        row.eventType.slice(DAILY_MISSION_CLAIMED_PREFIX.length),
      ),
    );
    const multiplier = this.streakMultiplierValue(dailyBonus.currentStreak);
    const offerViews = eventCounts.get('offer_view') ?? 0;
    const promoClicks = eventCounts.get('promo_banner_click') ?? 0;
    const purchaseSuccess = eventCounts.get('offer_purchase_success') ?? 0;

    const missions = [
      {
        id: 'daily_bonus',
        title: 'Заберите ежедневный бонус',
        subtitle: dailyBonus.claimedToday
          ? 'Streak сохранён на сегодня'
          : `Сегодня доступно +${dailyBonus.todayReward.points} Points`,
        icon: 'gift.fill',
        tint: 'orange',
        progress: dailyBonus.claimedToday ? 1 : 0,
        goal: 1,
        rewardPoints: this.missionReward(10, multiplier),
        destination: 'daily_bonus',
        priority: dailyBonus.claimedToday ? 50 : 120,
      },
      {
        id: 'spin_wheel',
        title: 'Крутите рулетку',
        subtitle:
          wheelStatus.spinsRemaining > 0
            ? `${wheelStatus.spinsRemaining} попытки ещё доступны`
            : 'Все попытки дня использованы',
        icon: 'dial.high.fill',
        tint: 'purple',
        progress: wheelStatus.spinsUsed,
        goal: wheelStatus.dailyLimit,
        rewardPoints: this.missionReward(20, multiplier),
        destination: 'wheel',
        priority: wheelStatus.spinsRemaining > 0 ? 110 : 40,
      },
      {
        id: 'open_deals',
        title: 'Откройте 2 выгодных оффера',
        subtitle: 'Perkly быстрее поймёт ваши интересы',
        icon: 'sparkles',
        tint: 'cyan',
        progress: offerViews,
        goal: 2,
        rewardPoints: this.missionReward(25, multiplier),
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
        rewardPoints: this.missionReward(15, multiplier),
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
        rewardPoints: this.missionReward(80, multiplier),
        destination: 'catalog',
        priority: todayPurchases > 0 || purchaseSuccess > 0 ? 60 : 70,
      },
    ];

    return missions.map((mission) => {
      const progress = Math.min(mission.progress, mission.goal);
      const completed = progress >= mission.goal;
      const claimed = claimedIds.has(mission.id);
      return {
        ...mission,
        progress,
        completed,
        claimed,
        claimable: completed && !claimed,
      };
    });
  }

  private async buildDailyBonusStatus(userId: string) {
    const { startOfDay, nextResetAt } = this.getWheelWindow();
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
    const yesterdayKey = this.dayKey(yesterday);
    const claimedToday = claimedDays.has(todayKey);
    const currentStreak = this.countStreak(
      claimedDays,
      claimedToday ? startOfDay : yesterday,
    );
    const longestStreak = this.longestStreak(claimedDays);
    const nextClaimStreak = claimedToday
      ? currentStreak + 1
      : currentStreak + 1;
    const todayReward = this.dailyBonusReward(nextClaimStreak);
    const nextReward = this.dailyBonusReward(nextClaimStreak + 1);

    return {
      currentStreak,
      longestStreak,
      canClaimToday: !claimedToday,
      claimedToday,
      streakAtRisk: !claimedToday && claimedDays.has(yesterdayKey),
      todayReward,
      nextReward,
      weekProgress: this.weekProgress(startOfDay, claimedDays),
      resetAt: nextResetAt.toISOString(),
    };
  }

  private weekProgress(today: Date, claimedDays: Set<string>) {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      const streakStep = index + 1;

      return {
        day: this.dayKey(day),
        label: day.toLocaleDateString('ru-RU', { weekday: 'short' }),
        claimed: claimedDays.has(this.dayKey(day)),
        reward: this.dailyBonusReward(streakStep),
      };
    });
  }

  private dailyBonusReward(streakDay: number): DailyBonusReward {
    if (streakDay >= 7) return { points: 120, label: 'x2 streak bonus' };
    if (streakDay >= 5) return { points: 80, label: 'Mega streak' };
    if (streakDay >= 3) return { points: 50, label: 'Streak boost' };
    return { points: 25, label: 'Daily bonus' };
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

  private dayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private getWheelWindow(now = new Date()) {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const nextResetAt = new Date(startOfDay);
    nextResetAt.setDate(nextResetAt.getDate() + 1);

    return { startOfDay, nextResetAt };
  }

  private pickWheelReward() {
    const totalWeight = WHEEL_REWARDS.reduce(
      (sum, reward) => sum + reward.weight,
      0,
    );
    let threshold = Math.random() * totalWeight;

    for (const reward of WHEEL_REWARDS) {
      threshold -= reward.weight;
      if (threshold <= 0) {
        return reward;
      }
    }

    return WHEEL_REWARDS[0];
  }
}
