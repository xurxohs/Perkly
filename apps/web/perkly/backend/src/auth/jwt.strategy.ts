import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV !== 'test') {
      throw new Error('JWT_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request) => {
          const cookie = request?.headers?.cookie;
          if (typeof cookie !== 'string') return null;
          const value = cookie
            .split(';')
            .map((part: string) => part.trim())
            .find((part: string) => part.startsWith('perkly_session='))
            ?.slice('perkly_session='.length);
          return value ? decodeURIComponent(value) : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret || 'test-only-jwt-secret',
    });
  }

  async validate(payload: any) {
    if (!payload.sid) throw new UnauthorizedException('Session is required');
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { deletedAt: null },
      },
      select: {
        id: true,
        lastUsedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            tier: true,
            tokensValidAfter: true,
            accountStatus: true,
            suspendedUntil: true,
          },
        },
      },
    });
    if (!session) throw new UnauthorizedException('Session expired');
    const { user } = session;
    if (user.accountStatus === 'SUSPENDED' && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
      throw new UnauthorizedException('Account suspended');
    }
    if (
      user.tokensValidAfter &&
      (!payload.iat || payload.iat * 1000 < user.tokensValidAfter.getTime())
    ) {
      throw new UnauthorizedException('Token revoked');
    }

    if (Date.now() - session.lastUsedAt.getTime() > 5 * 60_000) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });
    }
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      sessionId: payload.sid,
    };
  }
}
