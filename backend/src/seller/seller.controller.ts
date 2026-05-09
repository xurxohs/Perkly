import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus } from '../common/enums';
import { EntitlementsService } from '../entitlements/entitlements.service';

@UseGuards(AuthGuard('jwt'))
@Controller('seller')
export class SellerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get('capabilities')
  async getCapabilities(
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.entitlements.getPartnerCapabilities(req.user.userId);
  }

  @Get('stats')
  async getStats(@Request() req: { user: { userId: string; role?: string } }) {
    const sellerId = req.user.userId;

    // Total earnings from COMPLETED (or non-refunded) transactions
    const earningsAggregate = await this.prisma.transaction.aggregate({
      where: {
        offer: { sellerId },
        status: TransactionStatus.COMPLETED,
      },
      _sum: {
        price: true,
      },
    });

    const totalSalesCount = await this.prisma.transaction.count({
      where: {
        offer: { sellerId },
      },
    });

    const activeOffersCount = await this.prisma.offer.count({
      where: {
        sellerId,
        isActive: true,
      },
    });

    const eventStats = await this.prisma.event.aggregate({
      where: { organizerId: sellerId },
      _count: { id: true },
      _sum: {
        viewersCount: true,
        participantsCount: true,
      },
    });

    // We can also fetch recent transactions
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { offer: { sellerId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        offer: { select: { id: true, title: true } },
        buyer: { select: { id: true, displayName: true, email: true } },
      },
    });

    return {
      totalEarnings: earningsAggregate._sum.price || 0,
      totalSales: totalSalesCount,
      activeOffers: activeOffersCount,
      activeEvents: eventStats._count.id || 0,
      eventViews: eventStats._sum.viewersCount || 0,
      eventParticipants: eventStats._sum.participantsCount || 0,
      recentTransactions,
    };
  }

  @Get('offers')
  async getMyOffers(
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.prisma.offer.findMany({
      where: { sellerId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });
  }

  @Get('events')
  async getMyEvents(
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.prisma.event.findMany({
      where: { organizerId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('transactions')
  async getMyTransactions(
    @Request() req: { user: { userId: string; role?: string } },
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    const sellerId = req.user.userId;
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { offer: { sellerId } },
        skip: parseInt(skip),
        take: parseInt(take),
        orderBy: { createdAt: 'desc' },
        include: {
          offer: { select: { id: true, title: true, price: true } },
          buyer: { select: { id: true, displayName: true, email: true } },
        },
      }),
      this.prisma.transaction.count({
        where: { offer: { sellerId } },
      }),
    ]);

    return { data, total };
  }
}
