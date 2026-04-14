import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Squad } from '@prisma/client';
import { BotService } from '../bot/bot.service';

@Injectable()
export class SquadsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
  ) {}

  async createSquad(userId: string, name: string): Promise<Squad> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.squadId) throw new BadRequestException('You are already in a squad');

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    return this.prisma.squad.create({
      data: {
        name,
        inviteCode,
        members: { connect: { id: userId } },
      },
      include: { members: true },
    });
  }

  async joinSquad(userId: string, inviteCode: string): Promise<Squad> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.squadId) throw new BadRequestException('You are already in a squad');

    const squad = await this.prisma.squad.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: { members: true },
    });

    if (!squad) throw new NotFoundException('Squad not found');
    if (squad.members.length >= 5) {
      throw new BadRequestException('Squad is full (max 5 members)');
    }

    const updatedSquad = await this.prisma.squad.update({
      where: { id: squad.id },
      data: { members: { connect: { id: userId } } },
      include: { members: true },
    });

    // Notify squad members
    for (const member of squad.members) {
      if (member.telegramId) {
        await this.botService.sendTelegramNotification(
          member.telegramId,
          `👥 *${user.displayName || 'Друг'}* присоединился к вашему скваду "${squad.name}"! Теперь вас ${updatedSquad.members.length}.`,
        );
      }
    }

    return updatedSquad;
  }

  async getSquadProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { squad: { include: { members: true } } },
    });

    if (!user?.squad) return null;

    const squad = user.squad;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const totalSpent = await this.prisma.transaction.aggregate({
      where: {
        buyerId: { in: squad.members.map((m) => m.id) },
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { price: true },
    });

    const currentSpending = totalSpent._sum.price || 0;
    const isGoalReached = currentSpending >= squad.monthlyGoal;

    return {
      squadId: squad.id,
      name: squad.name,
      inviteCode: squad.inviteCode,
      members: squad.members.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl,
      })),
      monthlyGoal: squad.monthlyGoal,
      currentSpending,
      isGoalReached,
      rewardTriggeredDate: squad.rewardTriggeredDate,
    };
  }

  async checkAndTriggerRewards(squadId: string) {
    const squad = await this.prisma.squad.findUnique({
      where: { id: squadId },
      include: { members: true },
    });

    if (!squad) return;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // If reward already triggered this month, skip
    if (squad.rewardTriggeredDate && squad.rewardTriggeredDate >= startOfMonth) {
      return;
    }

    const totalSpent = await this.prisma.transaction.aggregate({
      where: {
        buyerId: { in: squad.members.map((m) => m.id) },
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { price: true },
    });

    const currentSpending = totalSpent._sum.price || 0;

    if (currentSpending >= squad.monthlyGoal) {
      await this.prisma.$transaction([
        this.prisma.squad.update({
          where: { id: squadId },
          data: { rewardTriggeredDate: new Date() },
        }),
        this.prisma.user.updateMany({
          where: { squadId },
          data: { hasSquadReward: true },
        }),
      ]);

      // Notify all members
      for (const member of squad.members) {
        if (member.telegramId) {
          await this.botService.sendTelegramNotification(
            member.telegramId,
            `🎊 *Поздравляем!* Ваш сквад "${squad.name}" выполнил цель месяца (1,000,000 сум)!\n\nВы получили статус *Mega Perk*: кешбэк 15% на вашу следующую покупку.`,
          );
        }
      }
    }
  }
}
