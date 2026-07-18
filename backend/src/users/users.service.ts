import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { SavedOffer, SAVED_OFFER_SELECT } from '../offers/offer.selects';
import * as bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'crypto';
import { StorageService } from '../storage/storage.service';

export const SUBSCRIPTION_PRICES: Record<string, number> = {
  GOLD: 59_880,
  PLATINUM: 119_880,
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

type B2CProfileInput = {
  birthDate?: string | null;
  birthYear?: number | null;
  gender?: string | null;
  city?: string | null;
  anonymousId?: string | null;
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
  private readonly passwordAttempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private prisma: PrismaService,
    private entitlements: EntitlementsService,
    private storage: StorageService,
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

  async exportPersonalData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...USER_SELECT,
        deletedAt: true,
        notifyPurchases: true,
        notifyMessages: true,
        notifyNearby: true,
        b2cProfile: true,
        interests: {
          select: {
            category: true,
            weight: true,
            source: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        savedOffers: {
          select: { offerId: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        savedEvents: {
          select: { eventId: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('Пользователь не найден');
    }

    const [transactions, deposits, reviews, subscriptions, financialEntries] =
      await Promise.all([
        this.prisma.transaction.findMany({
          where: { buyerId: userId },
          select: {
            id: true,
            offerId: true,
            price: true,
            status: true,
            isGift: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.deposit.findMany({
          where: { userId },
          select: {
            id: true,
            amount: true,
            provider: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.review.findMany({
          where: { authorId: userId },
          select: {
            id: true,
            offerId: true,
            rating: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.subscription.findMany({
          where: { userId },
          orderBy: { startDate: 'asc' },
        }),
        this.prisma.financialEntry.findMany({
          where: { userId },
          select: {
            id: true,
            transactionId: true,
            depositId: true,
            type: true,
            amount: true,
            balanceAfter: true,
            currency: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

    await this.prisma.adminLog.create({
      data: {
        adminId: userId,
        action: 'PERSONAL_DATA_EXPORTED',
        targetId: userId,
        details: JSON.stringify({ requestedAt: new Date().toISOString() }),
      },
    });

    return {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      currency: 'UZS',
      user,
      transactions,
      deposits,
      reviews,
      subscriptions,
      financialEntries,
    };
  }

  async updateProfile(
    id: string,
    data: { displayName?: string; avatarUrl?: string | null },
  ) {
    const update: { displayName?: string; avatarUrl?: string | null } = {};
    if (data.displayName !== undefined) {
      const displayName = data.displayName.trim().replace(/\s+/g, ' ');
      if (displayName.length < 2 || displayName.length > 60) {
        throw new BadRequestException('Имя должно содержать от 2 до 60 символов');
      }
      update.displayName = displayName;
    }
    if (data.avatarUrl !== undefined) update.avatarUrl = data.avatarUrl;

    return this.prisma.user.update({
      where: { id },
      data: update,
      select: USER_SELECT,
    });
  }

  async uploadAvatar(userId: string, dataUrl: string) {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new BadRequestException('Expected a base64 data URL');

    const mime = match[1].toLowerCase();
    const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    if (!allowed.has(mime)) throw new BadRequestException('Unsupported image type');

    const source = Buffer.from(match[2], 'base64');
    if (source.length === 0 || source.length > 6 * 1024 * 1024) {
      throw new BadRequestException('Avatar must be between 1 byte and 6 MB');
    }

    let body: Buffer;
    try {
      const sharpModule = await import('sharp');
      const sharpFactory = ((sharpModule as unknown as { default?: typeof import('sharp') }).default
        ?? sharpModule) as unknown as typeof import('sharp');
      body = await sharpFactory(source, { limitInputPixels: 25_000_000 })
        .rotate()
        .resize(768, 768, { fit: 'cover', position: 'centre' })
        .webp({ quality: 84, effort: 4 })
        .toBuffer();
    } catch {
      throw new BadRequestException('Invalid or corrupted image');
    }

    const key = `avatars/${userId}/${Date.now()}-${randomUUID()}.webp`;
    const avatarUrl = await this.storage.put(key, body, 'image/webp');
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: USER_SELECT,
    });
  }

  removeAvatar(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: USER_SELECT,
    });
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true, deletedAt: true },
    });
    if (!target || target.deletedAt) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const result = await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });
    return { success: true, removed: result.count > 0 };
  }

  listBlockedUsers(blockerId: string) {
    return this.prisma.userBlock.findMany({
      where: {
        blockerId,
        blocked: { deletedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        blocked: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getPasswordStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return { hasPassword: Boolean(user.passwordHash) };
  }

  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
  ) {
    const attempt = this.passwordAttempts.get(userId);
    if (attempt && attempt.resetAt > Date.now() && attempt.count >= 5) {
      throw new HttpException(
        'Слишком много попыток. Попробуйте через 15 минут',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (newPassword.length < 8) {
      throw new BadRequestException(
        'Новый пароль должен содержать минимум 8 символов',
      );
    }
    if (newPassword.length > 128) {
      throw new BadRequestException('Пароль слишком длинный');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    if (user.passwordHash) {
      const valid =
        Boolean(currentPassword) &&
        (await bcrypt.compare(currentPassword!, user.passwordHash));
      if (!valid) {
        this.recordPasswordFailure(userId);
        throw new BadRequestException('Текущий пароль указан неверно');
      }
      if (await bcrypt.compare(newPassword, user.passwordHash)) {
        throw new BadRequestException(
          'Новый пароль должен отличаться от текущего',
        );
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    this.passwordAttempts.delete(userId);
    return { success: true };
  }

  private recordPasswordFailure(userId: string) {
    const now = Date.now();
    const current = this.passwordAttempts.get(userId);
    if (!current || current.resetAt <= now) {
      this.passwordAttempts.set(userId, {
        count: 1,
        resetAt: now + 15 * 60_000,
      });
      return;
    }
    current.count += 1;
  }

  async deleteAccount(
    userId: string,
    currentPassword: string | undefined,
    confirmation: string,
  ) {
    const attempt = this.passwordAttempts.get(userId);
    if (attempt && attempt.resetAt > Date.now() && attempt.count >= 5) {
      throw new HttpException(
        'Слишком много попыток. Попробуйте через 15 минут',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (confirmation !== 'УДАЛИТЬ') {
      throw new BadRequestException('Введите УДАЛИТЬ для подтверждения');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, deletedAt: true },
    });
    if (!user || user.deletedAt)
      throw new NotFoundException('Пользователь не найден');

    if (user.passwordHash) {
      const valid =
        Boolean(currentPassword) &&
        (await bcrypt.compare(currentPassword!, user.passwordHash));
      if (!valid) {
        this.recordPasswordFailure(userId);
        throw new BadRequestException('Текущий пароль указан неверно');
      }
    }

    const activeOperations = await this.prisma.transaction.count({
      where: {
        status: { in: ['PENDING', 'PAID', 'ESCROW', 'DISPUTED'] },
        OR: [{ buyerId: userId }, { offer: { sellerId: userId } }],
      },
    });
    if (activeOperations > 0) {
      throw new BadRequestException(
        'Сначала завершите активные покупки, продажи и споры',
      );
    }

    const deletedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: deletedAt },
      });
      await tx.savedOffer.deleteMany({ where: { userId } });
      await tx.userInterest.deleteMany({ where: { userId } });
      await tx.b2CProfile.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@deleted.perkly.local`,
          passwordHash: null,
          displayName: 'Удалённый пользователь',
          avatarUrl: null,
          telegramId: null,
          phone: null,
          deviceToken: null,
          balance: 0,
          rewardPoints: 0,
          role: 'USER',
          tier: 'SILVER',
          squadId: null,
          deletedAt,
          tokensValidAfter: deletedAt,
        },
      });
    });

    this.passwordAttempts.delete(userId);
    return { success: true };
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
      where: {
        userId,
        offer: { isActive: true, moderationStatus: 'APPROVED' },
      },
      orderBy: { createdAt: 'desc' },
      select: SAVED_OFFER_SELECT,
    });
  }

  async getB2CProfile(userId: string) {
    await this.ensureUserExists(userId);

    return this.prisma.b2CProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updateB2CProfile(userId: string, input: B2CProfileInput) {
    await this.ensureUserExists(userId);
    const data = this.normalizeB2CProfileInput(input);

    return this.prisma.b2CProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  }

  listInterests(userId: string) {
    return this.prisma.userInterest.findMany({
      where: { userId },
      orderBy: [{ weight: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async replaceInterests(userId: string, interests: string[]) {
    await this.ensureUserExists(userId);
    const categories = this.normalizeInterests(interests);

    return this.prisma.$transaction(async (tx) => {
      await tx.userInterest.deleteMany({
        where: {
          userId,
          category: { notIn: categories.length ? categories : [''] },
          source: 'ONBOARDING',
        },
      });

      await Promise.all(
        categories.map((category, index) =>
          tx.userInterest.upsert({
            where: { userId_category: { userId, category } },
            create: {
              userId,
              category,
              weight: Math.max(1, categories.length - index),
              source: 'ONBOARDING',
            },
            update: {
              weight: Math.max(1, categories.length - index),
              source: 'ONBOARDING',
            },
          }),
        ),
      );

      return tx.userInterest.findMany({
        where: { userId },
        orderBy: [{ weight: 'desc' }, { updatedAt: 'desc' }],
      });
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
        `Insufficient balance. Need ${cost.toLocaleString('ru-RU')} UZS, have ${user.balance.toLocaleString('ru-RU')} UZS`,
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

  private normalizeB2CProfileInput(input: B2CProfileInput) {
    const data: {
      birthDate?: Date | null;
      birthYear?: number | null;
      gender?: string | null;
      city?: string | null;
      anonymousId?: string | null;
    } = {};

    if (input.birthDate !== undefined) {
      data.birthDate =
        input.birthDate === null ? null : this.normalizeDate(input.birthDate);
    }

    if (input.birthYear !== undefined) {
      data.birthYear =
        input.birthYear === null
          ? null
          : this.normalizeBirthYear(input.birthYear);
    }

    if (input.gender !== undefined) {
      data.gender =
        input.gender === null
          ? null
          : this.normalizeOptionalString(input.gender);
    }

    if (input.city !== undefined) {
      data.city =
        input.city === null ? null : this.normalizeOptionalString(input.city);
    }

    if (input.anonymousId !== undefined) {
      data.anonymousId =
        input.anonymousId === null
          ? null
          : this.normalizeOptionalString(input.anonymousId);
    }

    return data;
  }

  private normalizeDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('birthDate must be a valid date');
    }
    return date;
  }

  private normalizeBirthYear(value: number) {
    if (!Number.isInteger(value)) {
      throw new BadRequestException('birthYear must be an integer');
    }

    const currentYear = new Date().getFullYear();
    if (value < 1900 || value > currentYear) {
      throw new BadRequestException(
        `birthYear must be between 1900 and ${currentYear}`,
      );
    }

    return value;
  }

  private normalizeOptionalString(value: string) {
    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
  }

  private normalizeInterests(interests: string[]) {
    if (!Array.isArray(interests)) {
      throw new BadRequestException('interests must be an array');
    }

    const seen = new Set<string>();
    const categories: string[] = [];

    for (const interest of interests) {
      const category = String(interest).trim();
      if (!category || seen.has(category)) continue;
      seen.add(category);
      categories.push(category);
    }

    if (categories.length > 30) {
      throw new BadRequestException(
        'interests cannot contain more than 30 items',
      );
    }

    return categories;
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
    let threshold = randomInt(totalWeight);

    for (const reward of WHEEL_REWARDS) {
      threshold -= reward.weight;
      if (threshold <= 0) {
        return reward;
      }
    }

    return WHEEL_REWARDS[0];
  }
}
