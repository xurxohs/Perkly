import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from '../bot/bot.service';
import * as apn from 'apn';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private apnProvider: apn.Provider | null = null;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
  ) {
    this.initApnProvider();
  }

  private initApnProvider() {
    // In production, ensure APN_KEY, APN_KEY_ID, APN_TEAM_ID, and APN_BUNDLE_ID are set in .env
    const key = process.env.APN_KEY; // can be path or base64 string
    const keyId = process.env.APN_KEY_ID;
    const teamId = process.env.APN_TEAM_ID;

    if (!key || !keyId || !teamId) {
      this.logger.warn('APNs credentials not fully configured. Push notifications are disabled.');
      return;
    }

    try {
      this.apnProvider = new apn.Provider({
        token: {
          key: Buffer.from(key, 'base64').toString() === key ? key : Buffer.from(key, 'base64'),
          keyId: keyId,
          teamId: teamId,
        },
        production: process.env.NODE_ENV === 'production',
      });
      this.logger.log('APNs Provider initialized successfully.');
    } catch (e: any) {
      this.logger.error(`Failed to initialize APNs: ${e.message}`);
    }
  }

  async updateDeviceToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deviceToken: token },
    });
    return { success: true };
  }

  async sendPushNotification(userId: string, title: string, body: string, payload?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deviceToken: true, telegramId: true },
    });

    // 1. Send via Telegram if connected
    if (user?.telegramId) {
      await this.botService.sendTelegramNotification(user.telegramId, `🔔 *${title}*\n\n${body}`);
    }

    // 2. Send via APNs if token exists
    if (!user?.deviceToken || !this.apnProvider) {
      return;
    }

    const note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    note.badge = 1;
    note.sound = 'ping.aiff';
    note.alert = { title, body };
    note.topic = process.env.APN_BUNDLE_ID || 'com.perkly.app'; // Your iOS App Bundle ID
    if (payload) note.payload = payload;

    try {
      const result = await this.apnProvider.send(note, user.deviceToken);
      if (result.failed.length > 0) {
        this.logger.error(`APNs Send Error: ${JSON.stringify(result.failed)}`);
        // If token is unregistered, we could remove it from DB
      }
    } catch (e: any) {
      this.logger.error(`APNs Exception: ${e.message}`);
    }
  }

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
