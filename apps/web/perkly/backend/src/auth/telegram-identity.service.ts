import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { TelegramWidgetData } from './auth.service';

@Injectable()
export class TelegramIdentityService {
  constructor(private readonly prisma: PrismaService) {}

  validateWidget(data: TelegramWidgetData): boolean {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return false;
    const { hash, ...userData } = data;
    if (!this.isFresh(userData.auth_date)) return false;
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const check = Object.keys(userData)
      .sort()
      .map((key) => `${key}=${String(userData[key])}`)
      .join('\n');
    const hmac = crypto.createHmac('sha256', secretKey).update(check).digest('hex');
    return this.hashEquals(hmac, hash);
  }

  validateMiniApp(initData: string): TelegramWidgetData | null {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return null;
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash || !this.isFresh(params.get('auth_date') ?? undefined)) return null;
    params.delete('hash');
    params.sort();
    const check = [...params.entries()].map(([key, value]) => `${key}=${value}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(check).digest('hex');
    if (!this.hashEquals(hmac, hash)) return null;
    const user = params.get('user');
    if (!user) return null;
    try {
      return JSON.parse(user) as TelegramWidgetData;
    } catch {
      return null;
    }
  }

  async resolveUser(data: TelegramWidgetData) {
    const telegramId = String(data.id);
    const existing = await this.prisma.user.findUnique({ where: { telegramId } });
    if (existing) return this.withoutPassword(existing);
    const email = `tg_${telegramId}@telegram.local`;
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('This Telegram identity conflicts with an existing account');
    }
    const created = await this.prisma.user.create({
      data: {
        email,
        telegramId,
        displayName: data.first_name ?? data.username ?? 'Telegram User',
        avatarUrl: data.photo_url ?? null,
      },
    });
    return this.withoutPassword(created);
  }

  async consume(digest: string): Promise<boolean> {
    if (!/^[a-f0-9]{64}$/i.test(digest)) return false;
    try {
      await this.prisma.consumedAuthAssertion.create({
        data: {
          digest: `telegram:${digest.toLowerCase()}`,
          expiresAt: new Date(Date.now() + 10 * 60_000),
        },
      });
      if (Math.random() < 0.01) {
        void this.prisma.consumedAuthAssertion.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      }
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return false;
      throw error;
    }
  }

  private isFresh(value: string | number | undefined) {
    const authDate = Number(value);
    if (!Number.isFinite(authDate) || authDate <= 0) return false;
    const ageSeconds = Math.floor(Date.now() / 1_000) - authDate;
    return ageSeconds >= -300 && ageSeconds <= 5 * 60;
  }

  private hashEquals(actual: string, expected: string) {
    if (!/^[a-f0-9]{64}$/i.test(expected)) return false;
    const actualBuffer = Buffer.from(actual, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  }

  private withoutPassword<T extends { passwordHash?: string | null }>(user: T) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
