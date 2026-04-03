import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const usersCount = await this.prisma.user.count();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await this.prisma.user.count({
      where: { createdAt: { gte: today } },
    });

    const activeOffersCount = await this.prisma.offer.count({
      where: { isActive: true },
    });

    // Total volume of COMPLETED and PAID transactions
    const totalVolumeResult = await this.prisma.transaction.aggregate({
      _sum: { price: true },
      where: { status: { in: ['COMPLETED', 'PAID'] } },
    });
    const totalVolume = totalVolumeResult._sum.price || 0;

    const openDisputesCount = await this.prisma.dispute.count({
      where: { status: 'OPEN' },
    });

    // Platform income: assumed as 5% of total volume
    const platformIncome = totalVolume * 0.05;

    const recentTransactions = await this.prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { buyer: true, offer: true },
    });

    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return {
      usersCount,
      newUsersToday,
      activeOffersCount,
      totalVolume,
      openDisputesCount,
      platformIncome,
      recentTransactions,
      recentUsers,
    };
  }

  // User Management
  async getAllUsers(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { displayName: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateUser(id: string, data: any, adminId: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        role: data.role,
        tier: data.tier,
        balance: data.balance,
      },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_USER',
        targetId: id,
        details: JSON.stringify(data),
      },
    });

    return user;
  }

  // Offers/Products Management
  async getAllOffers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [offers, total] = await Promise.all([
      this.prisma.offer.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { seller: true },
      }),
      this.prisma.offer.count(),
    ]);
    return { offers, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateOffer(id: string, data: any, adminId: string) {
    const offer = await this.prisma.offer.update({
      where: { id },
      data: { isActive: data.isActive },
    });
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_OFFER',
        targetId: id,
        details: JSON.stringify(data),
      },
    });
    return offer;
  }

  async deleteOffer(id: string, adminId: string) {
    const offer = await this.prisma.offer.delete({ where: { id } });
    await this.prisma.adminLog.create({
      data: { adminId, action: 'DELETE_OFFER', targetId: id },
    });
    return offer;
  }

  // Transactions
  async getAllTransactions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { buyer: true, offer: { include: { seller: true } } },
      }),
      this.prisma.transaction.count(),
    ]);
    return { transactions, total, page, totalPages: Math.ceil(total / limit) };
  }

  async refundTransaction(id: string, adminId: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: { buyer: true, offer: { include: { seller: true } } },
    });
    if (!tx || (tx.status !== 'COMPLETED' && tx.status !== 'PAID')) {
      throw new NotFoundException('Transaction not valid for refund');
    }

    // Process refund logic using transactions (prisma.$transaction) to ensure atomicity
    await this.prisma.$transaction(async (prisma) => {
      // 1. Mark status as CANCELLED
      await prisma.transaction.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // 2. Refund buyer
      await prisma.user.update({
        where: { id: tx.buyerId },
        data: { balance: { increment: tx.price } },
      });

      // 3. Deduct from seller (ignoring platform fee logic for now, or deducting what they earned)
      if (tx.offer?.sellerId) {
        await prisma.user.update({
          where: { id: tx.offer.sellerId },
          data: { balance: { decrement: tx.price * 0.95 } }, // assuming 5% fee was taken
        });
      }

      // 4. Log the action
      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'REFUND_TRANSACTION',
          targetId: id,
          details: JSON.stringify({ amount: tx.price }),
        },
      });
    });

    return { message: 'Refund successful' };
  }

  // Disputes
  async getAllDisputes(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          transaction: {
            include: { buyer: true, offer: { include: { seller: true } } },
          },
        },
      }),
      this.prisma.dispute.count(),
    ]);
    return { disputes, total, page, totalPages: Math.ceil(total / limit) };
  }

  async resolveDispute(
    id: string,
    resolution: 'BUYER' | 'SELLER',
    adminId: string,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { transaction: true },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');

    await this.prisma.$transaction(async (prisma) => {
      // 1. Close dispute
      await prisma.dispute.update({
        where: { id },
        data: { status: 'CLOSED' },
      });

      const tx = dispute.transaction;
      if (resolution === 'BUYER') {
        // Refund Buyer
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { status: 'CANCELLED' },
        });
        await prisma.user.update({
          where: { id: tx.buyerId },
          data: { balance: { increment: tx.price } },
        });
      } else if (resolution === 'SELLER') {
        // Payout to Seller
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { status: 'COMPLETED' },
        });
        // Assume seller already has their frozen balance moved or we increment it here
        const offer = await prisma.offer.findUnique({
          where: { id: tx.offerId },
        });
        if (offer) {
          await prisma.user.update({
            where: { id: offer.sellerId },
            data: { balance: { increment: tx.price * 0.95 } },
          });
        }
      }

      // 3. Log the action
      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'RESOLVE_DISPUTE',
          targetId: id,
          details: JSON.stringify({ resolution }),
        },
      });
    });

    return { message: 'Dispute resolved' };
  }
}
