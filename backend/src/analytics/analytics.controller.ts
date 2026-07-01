import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AnalyticsService } from './analytics.service';

interface TrackEventBody {
  eventType: string;
  offerId?: string;
  metadata?: string;
}

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('events')
  async trackEvent(
    @Body() body: TrackEventBody,
    @Headers('x-session-id') sessionId?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = this.resolveUserId(authorization);

    return this.analyticsService.trackEvent({
      eventType: body.eventType,
      userId,
      sessionId,
      offerId: body.offerId,
      metadata: body.metadata,
    });
  }

  @Get('events')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async getEvents(
    @Request() _req: { user: { role: string } },
    @Query('eventType') eventType?: string,
    @Query('userId') userId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.analyticsService.getEvents({
      eventType,
      userId,
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 50,
    });
  }

  private resolveUserId(authorization?: string): string | undefined {
    if (!authorization?.startsWith('Bearer ')) return undefined;

    try {
      const payload = this.jwtService.verify<{ sub?: string }>(
        authorization.slice('Bearer '.length),
      );
      return payload.sub;
    } catch {
      return undefined;
    }
  }
}
