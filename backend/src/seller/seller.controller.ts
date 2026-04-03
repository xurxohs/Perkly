import {
  Controller,
  Get,
  UseGuards,
  Request,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus, Role } from '../common/enums';

@UseGuards(AuthGuard('jwt'))
@Controller('seller')
export class SellerController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
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

    // We can also fetch recent transactions
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { offer: { sellerId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        offer: { select: { title: true } },
        buyer: { select: { displayName: true, email: true } },
      },
    });

    return {
      totalEarnings: earningsAggregate._sum.price || 0,
      totalSales: totalSalesCount,
      activeOffers: activeOffersCount,
      recentTransactions,
    };
  }

  @Get('offers')
  async getMyOffers(@Request() req: any) {
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

  @Get('transactions')
  async getMyTransactions(
    @Request() req: any,
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
          offer: { select: { title: true, price: true } },
          buyer: { select: { displayName: true, email: true } },
        },
      }),
      this.prisma.transaction.count({
        where: { offer: { sellerId } },
      }),
    ]);

    return { data, total };
  }
}
