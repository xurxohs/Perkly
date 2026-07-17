import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

export type TelegramLoginFlow = 'login' | 'link';
export type TelegramLoginStatus = 'pending' | 'resolved' | 'error';

export interface TelegramLoginSession {
  flow: TelegramLoginFlow;
  status: TelegramLoginStatus;
  createdAt: number;
  userId?: string;
  telegramId?: string;
  jwt?: string;
  user?: {
    email: string;
    sub: string;
    role: string;
    tier: string;
    sid?: string;
  };
  error?: string;
  device?: {
    deviceId?: string;
    deviceName?: string;
    userAgent?: string;
  };
}

type FallbackValue = { value: string; expiresAt: number };

@Injectable()
export class TelegramLoginStore implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramLoginStore.name);
  private readonly redis?: Redis;
  private readonly fallback = new Map<string, FallbackValue>();
  private readonly ttlSeconds = 5 * 60;
  private readonly prefix = 'perkly:telegram-login';

  constructor() {
    const url = process.env.REDIS_URL?.trim();
    if (!url) return;

    this.redis = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
    });
    this.redis.on('error', (error) => {
      this.logger.warn(`Telegram login Redis unavailable: ${error.message}`);
    });
  }

  async create(
    session: Omit<TelegramLoginSession, 'createdAt' | 'status'>,
  ): Promise<string> {
    const token = randomUUID();
    await this.writeSession(token, {
      ...session,
      status: 'pending',
      createdAt: Date.now(),
    });
    return token;
  }

  async get(token: string): Promise<TelegramLoginSession | null> {
    const raw = await this.read(this.sessionKey(token));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TelegramLoginSession;
    } catch {
      await this.remove(this.sessionKey(token));
      return null;
    }
  }

  async claim(
    token: string,
    telegramId: string,
  ): Promise<{ session?: TelegramLoginSession; error?: string }> {
    const session = await this.get(token);
    if (!session) return { error: 'Запрос входа истёк. Откройте Perkly и попробуйте снова.' };
    if (session.status !== 'pending') {
      return { error: 'Этот запрос уже использован. Создайте новый запрос в Perkly.' };
    }

    const owner = await this.acquireClaim(token, telegramId);
    if (owner !== telegramId) {
      return { error: 'Этот запрос уже открыт в другом Telegram-аккаунте.' };
    }
    if (session.telegramId && session.telegramId !== telegramId) {
      return { error: 'Этот запрос уже открыт в другом Telegram-аккаунте.' };
    }

    const previousToken = await this.read(this.telegramKey(telegramId));
    if (previousToken && previousToken !== token) {
      await this.remove(this.claimKey(previousToken));
    }

    const claimed = { ...session, telegramId };
    await Promise.all([
      this.writeSession(token, claimed),
      this.write(this.telegramKey(telegramId), token),
    ]);
    return { session: claimed };
  }

  async tokenForTelegram(telegramId: string): Promise<string | null> {
    return this.read(this.telegramKey(telegramId));
  }

  async complete(token: string, session: TelegramLoginSession) {
    await this.writeSession(token, session);
    if (session.telegramId) {
      await this.remove(this.telegramKey(session.telegramId));
    }
  }

  async onModuleDestroy() {
    if (this.redis && this.redis.status !== 'end') await this.redis.quit();
  }

  private async acquireClaim(token: string, telegramId: string) {
    if (this.redis) {
      try {
        await this.ensureRedis();
        const result = await this.redis.set(
          this.claimKey(token),
          telegramId,
          'EX',
          this.ttlSeconds,
          'NX',
        );
        return result === 'OK'
          ? telegramId
          : await this.redis.get(this.claimKey(token));
      } catch {
        // Local fallback keeps single-instance development usable.
      }
    }

    const key = this.claimKey(token);
    const existing = this.readFallback(key);
    if (existing) return existing;
    this.writeFallback(key, telegramId);
    return telegramId;
  }

  private async writeSession(token: string, session: TelegramLoginSession) {
    await this.write(this.sessionKey(token), JSON.stringify(session));
  }

  private async read(key: string): Promise<string | null> {
    if (this.redis) {
      try {
        await this.ensureRedis();
        return await this.redis.get(key);
      } catch {
        // Local fallback keeps single-instance development usable.
      }
    }
    return this.readFallback(key);
  }

  private async write(key: string, value: string) {
    if (this.redis) {
      try {
        await this.ensureRedis();
        await this.redis.set(key, value, 'EX', this.ttlSeconds);
        return;
      } catch {
        // Local fallback keeps single-instance development usable.
      }
    }
    this.writeFallback(key, value);
  }

  private async remove(key: string) {
    if (this.redis) {
      try {
        await this.ensureRedis();
        await this.redis.del(key);
      } catch {
        // Also clear the local fallback below.
      }
    }
    this.fallback.delete(key);
  }

  private async ensureRedis() {
    if (this.redis?.status === 'wait') await this.redis.connect();
  }

  private readFallback(key: string) {
    const entry = this.fallback.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.fallback.delete(key);
      return null;
    }
    return entry.value;
  }

  private writeFallback(key: string, value: string) {
    this.fallback.set(key, {
      value,
      expiresAt: Date.now() + this.ttlSeconds * 1_000,
    });
    if (this.fallback.size > 5_000) {
      for (const candidate of this.fallback.keys()) {
        this.readFallback(candidate);
      }
    }
  }

  private sessionKey(token: string) {
    return `${this.prefix}:session:${token}`;
  }

  private claimKey(token: string) {
    return `${this.prefix}:claim:${token}`;
  }

  private telegramKey(telegramId: string) {
    return `${this.prefix}:telegram:${telegramId}`;
  }
}
