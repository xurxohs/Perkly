import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface TrackEventDto {
  eventType: string;
  userId?: string;
  sessionId?: string;
  offerId?: string;
  metadata?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async trackEvent(data: TrackEventDto) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const event = await (this.prisma as any).analyticsEvent.create({
        data: {
          eventType: data.eventType,
          userId: data.userId || null,
          sessionId: data.sessionId || null,
          offerId: data.offerId || null,
          metadata: data.metadata || null,
        },
      });
      this.logger.log(`Event tracked: ${data.eventType}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return event;
    } catch (error) {
      this.logger.error(
        `Failed to track event: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getEvents(filters?: {
    eventType?: string;
    userId?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.eventType) where.eventType = filters.eventType;
    if (filters?.userId) where.userId = filters.userId;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const data = await (this.prisma as any).analyticsEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip || 0,
      take: filters?.take || 50,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const total = await (this.prisma as any).analyticsEvent.count({ where });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { data, total };
  }
}
