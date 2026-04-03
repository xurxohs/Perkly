import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from '../bot/bot.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private botService: BotService,
  ) {}

  // Run every hour to check for expiring flash drops
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiringFlashDrops() {
    this.logger.log('Checking for expiring flash drops...');

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find active flash drops expiring in the next 2 hours
    const expiringDrops = await this.prisma.offer.findMany({
      where: {
        isActive: true,
        isFlashDrop: true,
        expiresAt: {
          gt: now,
          lte: twoHoursFromNow,
        },
      },
    });

    if (expiringDrops.length === 0) return;

    // In a real app, you might notify a specific subset of opted-in users or high-tier users.
    // For demonstration, we'll notify users who have logged in via Telegram recently (or just broadly).
    // Let's find distinct users who have a Telegram ID to notify.
    const usersToNotify = await this.prisma.user.findMany({
      where: {
        telegramId: { not: null },
      },
      take: 100, // Limit to 100 to avoid hitting Telegram API limits massively in one go during demo
    });

    for (const drop of expiringDrops) {
      const message = `⏳ *Внимание! Акция скоро сгорит!*\n\nТовар "${drop.title}" со скидкой исчезнет менее чем через 2 часа.\n\nЗаходите на платформу, пока кто-то другой не забрал его!`;
      for (const user of usersToNotify) {
        if (user.telegramId) {
          await this.botService.sendTelegramNotification(
            user.telegramId,
            message,
          );
        }
      }
    }
  }

  // Run daily at 18:00 (6 PM) to remind about the Wheel of Fortune
  @Cron('0 18 * * *')
  async checkDailySpins() {
    this.logger.log('Sending daily wheel of fortune reminders...');

    // In a fully implemented app, we would track the last spin date for each user.
    // For now, we will notify standard active users who have connected Telegram.
    const usersToNotify = await this.prisma.user.findMany({
      where: {
        telegramId: { not: null },
      },
      take: 100, // Limit for demo purposes
    });

    const message = `🎡 *Не забудьте про Колесо Фортуны!*\n\nВаш бесплатный спин на сегодня уже ждет вас.\nЗаберите свои Perkly Points, скидочные купоны или другие призы прямо сейчас!`;

    for (const user of usersToNotify) {
      if (user.telegramId) {
        await this.botService.sendTelegramNotification(
          user.telegramId,
          message,
        );
      }
    }
  }
}
