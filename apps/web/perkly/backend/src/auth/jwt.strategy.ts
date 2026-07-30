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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'test-only-jwt-secret',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, tokensValidAfter: true, accountStatus: true, suspendedUntil: true },
    });
    if (!user) throw new UnauthorizedException('Account unavailable');
    if (user.accountStatus === 'SUSPENDED' && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
      throw new UnauthorizedException('Account suspended');
    }
    if (
      user.tokensValidAfter &&
      (!payload.iat || payload.iat * 1000 < user.tokensValidAfter.getTime())
    ) {
      throw new UnauthorizedException('Token revoked');
    }

    if (payload.sid) {
      const session = await this.prisma.userSession.findFirst({
        where: {
          id: payload.sid,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, lastUsedAt: true },
      });
      if (!session) throw new UnauthorizedException('Session expired');
      if (Date.now() - session.lastUsedAt.getTime() > 5 * 60_000) {
        await this.prisma.userSession.update({
          where: { id: session.id },
          data: { lastUsedAt: new Date() },
        });
      }
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      tier: payload.tier,
      sessionId: payload.sid,
    };
  }
}
