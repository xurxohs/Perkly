import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AnalyticsService } from '../analytics/analytics.service';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import * as jsonwebtoken from 'jsonwebtoken';
import {
  TelegramLoginFlow,
  TelegramLoginSession,
  TelegramLoginStore,
} from './telegram-login-store.service';

export interface JwtPayload {
  email: string;
  sub: string;
  role: string;
  tier: string;
  sid?: string;
}

export interface SessionDevice {
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
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
  private readonly logger = new Logger(AuthService.name);
  private appleKeysCache?: { keys: Array<Record<string, unknown>>; expiresAt: number };

  @Cron('0 3 * * *')
  async cleanupExpiredSessions() {
    const revokedBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expiredCodeBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return Promise.all([
      this.prisma.userSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { revokedAt: { lt: revokedBefore } },
          ],
        },
      }),
      this.prisma.passwordResetCode.deleteMany({
        where: { expiresAt: { lt: expiredCodeBefore } },
      }),
    ]);
  }

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => AnalyticsService))
    private analyticsService: AnalyticsService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private telegramLoginStore: TelegramLoginStore,
  ) {}

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

  async login(user: Omit<UserRecord, 'passwordHash'>, device: SessionDevice = {}) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await this.createUserSession(user.id, device, expiresAt);
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tier: user.tier,
      sid: session.id,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: payload,
    };
  }

  async register(data: Record<string, unknown>) {
    const email =
      typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    const password = typeof data.password === 'string' ? data.password : '';
    const displayName =
      typeof data.displayName === 'string'
        ? data.displayName.trim().slice(0, 80)
        : undefined;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        ...(displayName ? { displayName } : {}),
      },
    });
    // Notify admin and webhook about new user
    this.analyticsService.onNewUserRegistered(user).catch(() => {});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...result } = user;
    return result;
  }

  async loginWithApple(
    identityToken: string,
    rawNonce: string,
    displayName: string | undefined,
    device: SessionDevice,
  ) {
    if (!identityToken || !rawNonce) {
      throw new BadRequestException('Некорректные данные Apple ID');
    }
    const payload = await this.verifyAppleIdentityToken(identityToken);
    const expectedNonce = crypto.createHash('sha256').update(rawNonce).digest('hex');
    if (payload.nonce !== expectedNonce) {
      throw new BadRequestException('Не удалось подтвердить запрос Apple ID');
    }

    let user = await this.prisma.user.findUnique({ where: { appleSub: payload.sub } });
    if (!user) {
      const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
      const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
      if (!email || !emailVerified) {
        throw new BadRequestException(
          'Apple не передал подтверждённый email. Отзовите доступ Perkly в настройках Apple ID и попробуйте снова.',
        );
      }

      const existing = await this.prisma.user.findFirst({
        where: { email, deletedAt: null },
      });
      if (existing) {
        user = await this.prisma.user.update({
          where: { id: existing.id },
          data: { appleSub: payload.sub },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email,
            appleSub: payload.sub,
            displayName: displayName?.trim().slice(0, 80) || 'Пользователь Apple',
          },
        });
        this.analyticsService.onNewUserRegistered(user).catch(() => {});
      }
    }
    return this.login(user, device);
  }

  private async verifyAppleIdentityToken(identityToken: string) {
    const audience = process.env.APPLE_CLIENT_ID;
    if (!audience) throw new Error('APPLE_CLIENT_ID is required');
    const decoded = jsonwebtoken.decode(identityToken, { complete: true });
    const kid = decoded && typeof decoded !== 'string' ? decoded.header.kid : undefined;
    if (!kid) throw new BadRequestException('Некорректный токен Apple ID');

    const keys = await this.getApplePublicKeys();
    const jwk = keys.find((key) => key.kid === kid);
    if (!jwk) {
      this.appleKeysCache = undefined;
      throw new BadRequestException('Ключ Apple ID не найден. Попробуйте снова.');
    }
    try {
      const publicKey = crypto.createPublicKey({
        key: jwk as crypto.JsonWebKey,
        format: 'jwk',
      });
      return jsonwebtoken.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
        audience,
        issuer: 'https://appleid.apple.com',
      }) as jsonwebtoken.JwtPayload & {
        sub: string;
        nonce?: string;
        email?: string;
        email_verified?: boolean | string;
      };
    } catch {
      throw new BadRequestException('Не удалось проверить токен Apple ID');
    }
  }

  private async getApplePublicKeys() {
    if (this.appleKeysCache && this.appleKeysCache.expiresAt > Date.now()) {
      return this.appleKeysCache.keys;
    }
    const response = await fetch('https://appleid.apple.com/auth/keys');
    if (!response.ok) throw new BadRequestException('Apple ID временно недоступен');
    const result = (await response.json()) as { keys?: Array<Record<string, unknown>> };
    if (!Array.isArray(result.keys)) {
      throw new BadRequestException('Некорректный ответ Apple ID');
    }
    this.appleKeysCache = {
      keys: result.keys,
      expiresAt: Date.now() + 60 * 60_000,
    };
    return result.keys;
  }

  async requestPasswordReset(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();
    const user = email
      ? await this.prisma.user.findFirst({
          where: { email, deletedAt: null },
          select: { id: true, email: true },
        })
      : null;

    if (user && !user.email.endsWith('@telegram.local')) {
      const code = crypto.randomInt(100000, 1000000).toString();
      await this.prisma.passwordResetCode.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await this.prisma.passwordResetCode.create({
        data: {
          userId: user.id,
          codeHash: this.hashResetCode(user.id, code),
          expiresAt: new Date(Date.now() + 10 * 60_000),
        },
      });
      void this.sendPasswordResetEmail(user.email, code);
    }

    return { success: true };
  }

  async resetPassword(rawEmail: string, code: string, newPassword: string) {
    const email = rawEmail.trim().toLowerCase();
    if (newPassword.length < 8 || newPassword.length > 128) {
      throw new BadRequestException('Пароль должен содержать от 8 до 128 символов');
    }
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Неверный или истёкший код');

    const reset = await this.prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!reset || reset.attempts >= 5) {
      throw new BadRequestException('Неверный или истёкший код');
    }

    const expected = Buffer.from(reset.codeHash, 'hex');
    const actual = Buffer.from(this.hashResetCode(user.id, code.trim()), 'hex');
    const valid = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    if (!valid) {
      await this.prisma.passwordResetCode.update({
        where: { id: reset.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Неверный или истёкший код');
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, tokensValidAfter: now },
      }),
      this.prisma.passwordResetCode.update({
        where: { id: reset.id },
        data: { consumedAt: now },
      }),
      this.prisma.userSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    return { success: true };
  }

  private hashResetCode(userId: string, code: string) {
    const secret = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('PASSWORD_RESET_SECRET is required');
    return crypto.createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');
  }

  private async sendPasswordResetEmail(email: string, code: string) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      this.logger.warn('Email provider is not configured; password reset email was not sent');
      return;
    }
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: 'Код восстановления Perkly',
          html: `<p>Код восстановления:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Код действует 10 минут. Если вы не запрашивали восстановление, ничего не делайте.</p>`,
        }),
      });
      if (!response.ok) {
        this.logger.error(`Password reset email delivery failed with status ${response.status}`);
      }
    } catch (error) {
      this.logger.error(`Password reset email delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  // ======= TELEGRAM PHONE LOGIN =======

  async createLoginToken(
    flow: TelegramLoginFlow,
    userId?: string,
    device: SessionDevice = {},
  ): Promise<{ token: string; url: string }> {
    if (flow === 'link' && !userId) {
      throw new BadRequestException('Authenticated user is required');
    }
    const token = await this.telegramLoginStore.create({
      flow,
      userId,
      device,
    });
    const BOT_USERNAME =
      process.env.TELEGRAM_BOT_USERNAME ?? 'PerklyLoginBot';
    const url = `https://t.me/${BOT_USERNAME}?start=login_${token}`;
    return { token, url };
  }

  claimLoginToken(token: string, telegramId: string) {
    return this.telegramLoginStore.claim(token, telegramId);
  }

  async resolveClaimedLogin(
    telegramId: string,
    phone: string,
    displayName: string,
  ) {
    const token = await this.telegramLoginStore.tokenForTelegram(telegramId);
    if (!token) {
      return {
        ok: false,
        message:
          'Не нашли активного запроса. Вернитесь в Perkly и попробуйте снова.',
      };
    }
    return this.resolveLoginToken(token, telegramId, phone, displayName);
  }

  async resolveLoginToken(
    token: string,
    telegramId: string,
    phone: string,
    displayName: string,
  ): Promise<{ ok: boolean; flow?: TelegramLoginFlow; message: string }> {
    const entry = await this.telegramLoginStore.get(token);
    if (!entry || entry.status !== 'pending') {
      return {
        ok: false,
        message: 'Запрос входа истёк. Откройте Perkly и попробуйте снова.',
      };
    }
    if (entry.telegramId !== telegramId) {
      return this.failTelegramLogin(
        token,
        entry,
        'Запрос был открыт в другом Telegram-аккаунте.',
      );
    }

    try {
      let user: UserRecord;
      let isNewUser = false;

      if (entry.flow === 'link') {
        if (!entry.userId) {
          return this.failTelegramLogin(
            token,
            entry,
            'Не удалось определить профиль для привязки.',
          );
        }
        const existingByTg = await this.prisma.user.findUnique({
          where: { telegramId },
        });
        if (existingByTg && existingByTg.id !== entry.userId) {
          return this.failTelegramLogin(
            token,
            entry,
            'Этот аккаунт Telegram уже привязан к другому профилю.',
          );
        }

        user = await this.prisma.user.update({
          where: { id: entry.userId },
          // Linking must never replace profile personalization with Telegram data.
          data: { telegramId, phone },
        });
      } else {
        const existing = await this.prisma.user.findUnique({
          where: { telegramId },
        });
        if (!existing) {
          isNewUser = true;
          const email = `tg_${telegramId}@telegram.local`;
          user = await this.prisma.user.upsert({
            where: { email },
            update: { telegramId, phone },
            create: { email, telegramId, phone, displayName },
          });
        } else {
          user = await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              phone,
              displayName: existing.displayName || displayName,
            },
          });
        }
        if (isNewUser) {
          this.analyticsService.onNewUserRegistered(user).catch(() => {});
        }
      }

      const payload: JwtPayload = {
        email: user.email,
        sub: user.id,
        role: user.role,
        tier: user.tier,
      };

      let jwt: string | undefined;
      if (entry.flow === 'login') {
        const session = await this.createUserSession(
          user.id,
          entry.device ?? {},
          new Date(Date.now() + 24 * 60 * 60 * 1000),
        );
        payload.sid = session.id;
        jwt = this.jwtService.sign(payload);
      }

      await this.telegramLoginStore.complete(token, {
        ...entry,
        status: 'resolved',
        jwt,
        user: payload,
      });
      return {
        ok: true,
        flow: entry.flow,
        message:
          entry.flow === 'link'
            ? 'Telegram и номер телефона подключены к вашему профилю.'
            : 'Вход подтверждён. Вернитесь в Perkly.',
      };
    } catch (error) {
      this.logger.error(
        `Telegram ${entry.flow} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.failTelegramLogin(
        token,
        entry,
        'Не удалось завершить операцию. Попробуйте создать новый запрос.',
      );
    }
  }

  listSessions(userId: string, currentSessionId?: string) {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    }).then((sessions) => sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    })));
  }

  private async createUserSession(
    userId: string,
    device: SessionDevice,
    expiresAt: Date,
  ) {
    const previousSessions = await this.prisma.userSession.count({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        deviceId: device.deviceId?.slice(0, 120),
        deviceName: device.deviceName?.slice(0, 120),
        userAgent: device.userAgent?.slice(0, 300),
        expiresAt,
      },
    });

    if (previousSessions > 0) {
      const deviceName = device.deviceName?.slice(0, 120) || 'Новое устройство';
      void this.notificationsService.sendPushNotification(
        userId,
        'Новый вход в Perkly',
        `В аккаунт выполнен вход: ${deviceName}. Если это были не вы, завершите сессию в настройках.`,
        { notificationType: 'security' },
        'security',
      );
    }
    return session;
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async revokeCurrentSession(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.prisma.userSession.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async revokeOtherSessions(userId: string, currentSessionId?: string) {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async pollLoginToken(token: string, expectedUserId?: string) {
    const entry = await this.telegramLoginStore.get(token);
    if (!entry) return { status: 'expired' };
    if (expectedUserId && entry.userId !== expectedUserId) {
      return { status: 'error', message: 'Запрос принадлежит другому профилю.' };
    }
    if (entry.status === 'resolved') {
      return entry.flow === 'link'
        ? { status: 'linked', user: entry.user }
        : { status: 'ok', access_token: entry.jwt, user: entry.user };
    }
    if (entry.status === 'error') {
      return {
        status: 'error',
        message: entry.error ?? 'Unknown error',
      };
    }
    return { status: 'pending' };
  }

  private async failTelegramLogin(
    token: string,
    entry: TelegramLoginSession,
    message: string,
  ): Promise<{ ok: false; flow: TelegramLoginFlow; message: string }> {
    await this.telegramLoginStore.complete(token, {
      ...entry,
      status: 'error',
      error: message,
    });
    return { ok: false, flow: entry.flow, message };
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
