import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus } from '../common/enums';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { sellerPayout } from '../common/money';

@Controller('seller')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('VENDOR', 'ADMIN')
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

    const completedVolume = earningsAggregate._sum.price || 0;

    return {
      totalEarnings: sellerPayout(completedVolume),
      completedVolume,
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
    @Query('status') status?: string,
  ) {
    const sellerId = req.user.userId;
    const parsedSkip = Number.parseInt(skip, 10);
    const parsedTake = Number.parseInt(take, 10);
    const safeSkip = Number.isFinite(parsedSkip) ? Math.max(0, parsedSkip) : 0;
    const safeTake = Number.isFinite(parsedTake)
      ? Math.min(100, Math.max(1, parsedTake))
      : 20;
    const allowedStatuses = new Set<string>(Object.values(TransactionStatus));
    const statusFilter = status && allowedStatuses.has(status) ? status : undefined;
    const where = {
      offer: { sellerId },
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: safeSkip,
        take: safeTake,
        orderBy: { createdAt: 'desc' },
        include: {
          offer: { select: { id: true, title: true, price: true } },
          buyer: { select: { id: true, displayName: true, email: true } },
        },
      }),
      this.prisma.transaction.count({
        where,
      }),
    ]);

    return { data, total };
  }
}
