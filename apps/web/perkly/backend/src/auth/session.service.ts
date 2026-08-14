import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export interface SessionDevice {
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  tier: string;
}

export interface IssuedSession {
  access_token: string;
  user: { email: string; sub: string; role: string; tier: string; sid: string };
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
  ) {}

  async issue(user: SessionUser, device: SessionDevice = {}): Promise<IssuedSession> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const previousSessions = await this.prisma.userSession.count({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        deviceId: device.deviceId?.slice(0, 120),
        deviceName: device.deviceName?.slice(0, 120),
        userAgent: device.userAgent?.slice(0, 300),
        expiresAt,
      },
    });
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tier: user.tier,
      sid: session.id,
    };

    if (previousSessions > 0) {
      const deviceName = device.deviceName?.slice(0, 120) || 'Новое устройство';
      void this.notifications.sendPushNotification(
        user.id,
        'Новый вход в Perkly',
        `В аккаунт выполнен вход: ${deviceName}. Если это были не вы, завершите сессию в настройках.`,
        { notificationType: 'security' },
        'security',
      );
    }

    return { access_token: this.jwt.sign(payload), user: payload };
  }

  present(req: FastifyRequest, reply: FastifyReply, result: IssuedSession) {
    if (!this.isBrowser(req)) return result;
    reply.header('Set-Cookie', this.cookie(result.access_token, 86_400));
    return { user: result.user };
  }

  clearBrowserCookie(reply: FastifyReply) {
    reply.header('Set-Cookie', this.cookie('', 0));
  }

  isBrowser(req: FastifyRequest) {
    const platform = req.headers['x-client-platform'];
    const value = Array.isArray(platform) ? platform[0] : platform;
    return value !== 'ios' && value !== 'android';
  }

  device(req: FastifyRequest): SessionDevice {
    const header = (name: string) => {
      const value = req.headers[name];
      return Array.isArray(value) ? value[0] : value;
    };
    return {
      deviceId: header('x-device-id'),
      deviceName: header('x-device-name'),
      userAgent: header('user-agent'),
    };
  }

  list(userId: string, currentSessionId?: string) {
    return this.prisma.userSession
      .findMany({
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
      })
      .then((sessions) =>
        sessions.map((session) => ({
          ...session,
          isCurrent: session.id === currentSessionId,
        })),
      );
  }

  async revoke(userId: string, sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  revokeCurrent(userId: string, sessionId?: string) {
    return sessionId ? this.revoke(userId, sessionId) : Promise.resolve({ success: true });
  }

  async revokeOthers(userId: string, currentSessionId?: string) {
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

  private cookie(token: string, maxAge: number) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `perkly_session=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${maxAge}`;
  }
}
