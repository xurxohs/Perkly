import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from '../bot/bot.service';

interface TrackEventDto {
  eventType: string;
  userId?: string;
  sessionId?: string;
  offerId?: string;
  metadata?: string;
}

interface UserData {
  id: string;
  email: string;
  displayName?: string | null;
  phone?: string | null;
  telegramId?: string | null;
  createdAt?: Date;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly adminTelegramId: string | undefined;
  private readonly webhookUrl: string | undefined;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
    private configService: ConfigService,
  ) {
    this.adminTelegramId = this.configService.get<string>('ADMIN_TELEGRAM_ID');
    this.webhookUrl = this.configService.get<string>(
      'GOOGLE_SHEETS_WEBHOOK_URL',
    );
  }

  async trackEvent(data: TrackEventDto) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const event = await (this.prisma as any).analyticsEvent.create({
        data: {
          eventType: data.eventType,
          userId: data.userId || null,
          sessionId: data.sessionId || null,
          offerId: data.offerId || null,
          metadata: data.metadata || null,
        },
      });
      this.logger.log(
        `Event tracked: ${data.eventType} (user: ${data.userId || 'anon'}, session: ${data.sessionId || 'none'})`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return event;
    } catch (error) {
      this.logger.error(
        `Failed to track event: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async notifyAdminNewUser(user: UserData) {
    if (!this.adminTelegramId) {
      this.logger.warn(
        'ADMIN_TELEGRAM_ID not set — skipping new user notification',
      );
      return;
    }

    const now = new Date().toLocaleString('ru-RU', {
      timeZone: 'Asia/Tashkent',
    });
    const message = [
      `🆕 *Новый пользователь зарегистрирован!*`,
      ``,
      `👤 Имя: ${user.displayName || '—'}`,
      `📧 Email: ${user.email}`,
      `📱 Телефон: ${user.phone || '—'}`,
      `🔗 Telegram: ${user.telegramId ? `ID ${user.telegramId}` : '—'}`,
      `📅 Дата: ${now}`,
      `🆔 ID: \`${user.id}\``,
    ].join('\n');

    await this.botService.sendTelegramNotification(
      this.adminTelegramId,
      message,
    );
    this.logger.log(`Admin notified about new user: ${user.email}`);
  }

  async sendToGoogleSheetsWebhook(user: UserData) {
    if (!this.webhookUrl) {
      this.logger.warn('GOOGLE_SHEETS_WEBHOOK_URL not set — skipping webhook');
      return;
    }

    try {
      const payload = {
        name: user.displayName || '',
        email: user.email,
        phone: user.phone || '',
        telegramId: user.telegramId || '',
        registeredAt: user.createdAt
          ? user.createdAt.toISOString()
          : new Date().toISOString(),
        userId: user.id,
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.warn(`Webhook responded with status ${response.status}`);
      } else {
        this.logger.log(
          `User data sent to Google Sheets webhook: ${user.email}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send webhook: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async onNewUserRegistered(user: UserData) {
    // Track the registration event
    await this.trackEvent({
      eventType: 'registration',
      userId: user.id,
      metadata: JSON.stringify({
        email: user.email,
        displayName: user.displayName,
      }),
    });

    // Notify admin via Telegram
    await this.notifyAdminNewUser(user);

    // Send data to Google Sheets
    await this.sendToGoogleSheetsWebhook(user);
  }

  async getEvents(filters?: {
    eventType?: string;
    userId?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.eventType) where.eventType = filters.eventType;
    if (filters?.userId) where.userId = filters.userId;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const data = await (this.prisma as any).analyticsEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip || 0,
      take: filters?.take || 50,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const total = await (this.prisma as any).analyticsEvent.count({ where });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { data, total };
  }
}
