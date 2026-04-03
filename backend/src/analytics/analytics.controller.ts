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
import { AnalyticsService } from './analytics.service';

interface TrackEventBody {
  eventType: string;
  offerId?: string;
  metadata?: string;
}

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  async trackEvent(
    @Body() body: TrackEventBody,
    @Headers('x-session-id') sessionId?: string,
    @Headers('authorization') authorization?: string,
  ) {
    // Try to extract userId from JWT if present
    let userId: string | undefined;
    if (authorization) {
      try {
        const token = authorization.replace('Bearer ', '');
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        );
        userId = payload.sub;
      } catch {
        // Not a valid JWT, ignore
      }
    }

    return this.analyticsService.trackEvent({
      eventType: body.eventType,
      userId,
      sessionId,
      offerId: body.offerId,
      metadata: body.metadata,
    });
  }

  @Get('events')
  @UseGuards(AuthGuard('jwt'))
  async getEvents(
    @Request() req: { user: { role: string } },
    @Query('eventType') eventType?: string,
    @Query('userId') userId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    // Only admins can view analytics events
    if (req.user.role !== 'ADMIN') {
      return { data: [], total: 0, error: 'Unauthorized' };
    }

    return this.analyticsService.getEvents({
      eventType,
      userId,
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 50,
    });
  }
}
