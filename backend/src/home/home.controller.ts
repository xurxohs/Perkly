import { Controller, Get, Query, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { HomeService } from './home.service';

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
  ) {}

  @Get('feed')
  feed(
    @Req() req: FastifyRequest,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.homeService.getFeed(this.resolveOptionalUser(req), {
      lat: this.optionalNumber(lat),
      lng: this.optionalNumber(lng),
      radiusKm: this.optionalNumber(radiusKm),
    });
  }

  private resolveOptionalUser(req: FastifyRequest): OptionalUser | null {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<{
        sub?: string;
        role?: string;
        tier?: string;
      }>(header.slice('Bearer '.length));
      if (!payload.sub) {
        return null;
      }

      return {
        userId: payload.sub,
        role: payload.role,
        tier: payload.tier,
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
