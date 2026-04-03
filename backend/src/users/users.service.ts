import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const SUBSCRIPTION_PRICES: Record<string, number> = {
  GOLD: 4.99,
  PLATINUM: 9.99,
};

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
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
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
    const [totalSpent, totalPurchases] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { buyerId: userId },
        _sum: { price: true },
      }),
      this.prisma.transaction.count({ where: { buyerId: userId } }),
    ]);

    return {
      totalSpent: totalSpent._sum.price ?? 0,
      totalPurchases,
    };
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

    const now = new Date();
    const endDate = new Date(now.getTime() + months * 30 * 86400_000);

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
      endDate,
      cost,
    };
  }
}
