import { Controller, Get, Query, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { HomeService } from './home.service';
import { JwtStrategy } from '../auth/jwt.strategy';

type OptionalUser = {
  userId: string;
  role?: string;
  tier?: string;
};

@Controller('home')
export class HomeController {
  constructor(
    private readonly homeService: HomeService,
    private readonly jwtService: JwtService,
    private readonly jwtStrategy: JwtStrategy,
  ) {}

  @Get('feed')
  async feed(
    @Req() req: FastifyRequest,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.homeService.getFeed(await this.resolveOptionalUser(req), {
      lat: this.optionalNumber(lat),
      lng: this.optionalNumber(lng),
      radiusKm: this.optionalNumber(radiusKm),
    });
  }

  private async resolveOptionalUser(
    req: FastifyRequest,
  ): Promise<OptionalUser | null> {
    const header = req.headers.authorization;
    const cookieToken = req.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('perkly_session='))
      ?.slice('perkly_session='.length);
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length)
      : cookieToken
        ? decodeURIComponent(cookieToken)
        : null;
    if (!token) return null;

    try {
      const payload = this.jwtService.verify<{
        sub?: string;
        role?: string;
        tier?: string;
        sid?: string;
        iat?: number;
      }>(token);
      if (!payload.sub) return null;
      const authenticated = await this.jwtStrategy.validate(payload);
      return {
        userId: authenticated.userId,
        role: authenticated.role,
        tier: authenticated.tier,
      };
    } catch {
      return null;
    }
  }

  private optionalNumber(value?: string) {
    if (!value) return undefined;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
  }
}
