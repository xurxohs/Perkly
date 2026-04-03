import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AnalyticsService } from '../analytics/analytics.service';

export interface JwtPayload {
  email: string;
  sub: string;
  role: string;
  tier: string;
}

export interface TelegramWidgetData {
  id: string | number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  hash: string;
  [key: string]: string | number | undefined;
}

interface LoginToken {
  status: 'pending' | 'resolved' | 'error';
  userId?: string; // If present, this is a binding request
  jwt?: string;
  user?: JwtPayload;
  error?: string;
  createdAt: number;
}

interface UserRecord {
  id: string;
  email: string;
  role: string;
  tier: string;
  passwordHash?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  telegramId?: string | null;
  phone?: string | null;
}

@Injectable()
export class AuthService {
  private loginTokens = new Map<string, LoginToken>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => AnalyticsService))
    private analyticsService: AnalyticsService,
  ) {
    // Clean up expired tokens every 10 minutes
    setInterval(
      () => {
        const now = Date.now();
        for (const [key, token] of this.loginTokens.entries()) {
          if (now - token.createdAt > 5 * 60 * 1000) {
            this.loginTokens.delete(key);
          }
        }
      },
      10 * 60 * 1000,
    );
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<UserRecord, 'passwordHash'> | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.passwordHash) {
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _pw, ...result } = user;
        return result;
      }
    }
    return null;
  }

  login(user: Omit<UserRecord, 'passwordHash'>) {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tier: user.tier,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: payload,
    };
  }

  async register(data: Record<string, unknown>) {
    const mutableData = { ...data };
    if (mutableData.password && typeof mutableData.password === 'string') {
      const salt = await bcrypt.genSalt();
      mutableData.passwordHash = await bcrypt.hash(mutableData.password, salt);
      delete mutableData.password;
    }
    const user = await this.prisma.user.create({
      data: mutableData as Prisma.UserCreateInput,
    });
    // Notify admin and webhook about new user
    this.analyticsService.onNewUserRegistered(user).catch(() => {});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...result } = user;
    return result;
  }

  // ======= TELEGRAM PHONE LOGIN =======

  createLoginToken(userId?: string): { token: string; url: string } {
    const token = uuidv4();
    const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? 'PerklyLoginBot';
    this.loginTokens.set(token, {
      status: 'pending',
      userId,
      createdAt: Date.now(),
    });
    const url = `https://t.me/${BOT_USERNAME}?start=login_${token}`;
    return { token, url };
  }

  async resolveLoginToken(
    token: string,
    telegramId: string,
    phone: string,
    displayName: string,
  ) {
    const entry = this.loginTokens.get(token);
    if (!entry || entry.status !== 'pending') return;

    let user: UserRecord;

    // If this is a binding request
    if (entry.userId) {
      const existingByTg = await this.prisma.user.findUnique({
        where: { telegramId },
      });

      if (existingByTg && existingByTg.id !== entry.userId) {
        entry.status = 'error';
        entry.error = 'Этот аккаунт Telegram уже привязан к другому профилю';
        this.loginTokens.set(token, entry);
        return;
      }

      user = await this.prisma.user.update({
        where: { id: entry.userId },
        data: { telegramId, phone, displayName },
      });
    } else {
      // Regular login/registration
      const existing = await this.prisma.user.findFirst({
        where: { telegramId },
      });
      if (!existing) {
        const email = `tg_${telegramId}@telegram.local`;
        user = await this.prisma.user.upsert({
          where: { email },
          // Note: onNewUserRegistered called below after upsert
          update: { telegramId, phone, displayName },
          create: { email, telegramId, phone, displayName },
        });
      } else {
        user = await this.prisma.user.update({
          where: { id: existing.id },
          data: { phone, displayName },
        });
      }
      // Notify admin about new Telegram user registration
      this.analyticsService.onNewUserRegistered(user).catch(() => {});
    }

    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tier: user.tier,
    };
    const jwt = this.jwtService.sign(payload);

    entry.status = 'resolved';
    entry.jwt = jwt;
    entry.user = payload;
    this.loginTokens.set(token, entry);
  }

  pollLoginToken(token: string): {
    status: string;
    access_token?: string;
    user?: JwtPayload | { message: string };
  } {
    const entry = this.loginTokens.get(token);
    if (!entry) return { status: 'expired' };
    if (entry.status === 'resolved') {
      return { status: 'ok', access_token: entry.jwt, user: entry.user };
    }
    if (entry.status === 'error') {
      return {
        status: 'error',
        user: { message: entry.error ?? 'Unknown error' },
      };
    }
    return { status: 'pending' };
  }

  // ======= LEGACY TELEGRAM WIDGET =======

  validateTelegramHash(data: TelegramWidgetData): boolean {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
      console.warn('TELEGRAM_BOT_TOKEN is not defined in env variables');
      return false;
    }
    const { hash, ...userData } = data;
    const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
    const dataCheckString = Object.keys(userData)
      .sort()
      .map((key) => `${key}=${String(userData[key])}`)
      .join('\n');
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    return hmac === hash;
  }

  validateTelegramMiniAppHash(initData: string): TelegramWidgetData | null {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
      console.warn('TELEGRAM_BOT_TOKEN is not defined in env variables');
      return null;
    }
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return null;
    urlParams.delete('hash');
    urlParams.sort();
    let dataCheckString = '';
    for (const [key, value] of urlParams.entries()) {
      dataCheckString += `${key}=${value}\n`;
    }
    dataCheckString = dataCheckString.slice(0, -1);
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    if (hmac === hash) {
      const userStr = urlParams.get('user');
      if (userStr) {
        try {
          return JSON.parse(userStr) as TelegramWidgetData;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  async validateOrCreateTelegramUser(telegramData: TelegramWidgetData) {
    const telegramIdStr = String(telegramData.id);
    const email = telegramData.username
      ? `${telegramData.username}@telegram.local`
      : `${telegramIdStr}@telegram.local`;
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          telegramId: telegramIdStr,
          displayName:
            telegramData.first_name ?? telegramData.username ?? 'Telegram User',
          avatarUrl: telegramData.photo_url ?? null,
        },
      });
      // Notify admin about new widget user
      this.analyticsService.onNewUserRegistered(user).catch(() => {});
    } else if (!user.telegramId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { telegramId: telegramIdStr },
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...result } = user;
    return result;
  }
}
