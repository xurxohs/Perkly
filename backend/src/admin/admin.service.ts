import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ADMIN_OFFER_SELECT, USER_ADMIN_SELECT } from '../offers/offer.selects';
import {
  isValidOfferPriceUzs,
  isWholeUzsAmount,
  MAX_OFFER_PRICE_UZS,
  MAX_WALLET_BALANCE_UZS,
  MIN_PAID_OFFER_PRICE_UZS,
  platformFee,
  sellerPayout,
} from '../common/money';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { assertAcceptableUserContent } from '../common/content-moderation';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [
      usersCount,
      newUsersToday,
      activeOffersCount,
      totalVolumeResult,
      openDisputesCount,
      pendingCompaniesCount,
      openReportsCount,
      openAppealsCount,
      diagnosticOccurrences,
      recentTransactions,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.offer.count({
        where: { isActive: true, moderationStatus: 'APPROVED' },
      }),
      this.prisma.transaction.aggregate({
        _sum: { price: true },
        where: { status: { in: ['COMPLETED', 'PAID'] } },
      }),
      this.prisma.dispute.count({ where: { status: 'OPEN' } }),
      this.prisma.company.count({
        where: { status: 'PENDING_MODERATION' },
      }),
      this.prisma.moderationReport.count({
        where: { status: { in: ['OPEN', 'REVIEWING'] } },
      }),
      this.prisma.moderationAppeal.count({
        where: { status: { in: ['OPEN', 'REVIEWING'] } },
      }),
      this.prisma.diagnosticIssue.aggregate({
        _sum: { occurrences: true },
      }),
      this.prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: USER_ADMIN_SELECT },
          offer: { select: ADMIN_OFFER_SELECT },
        },
      }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: USER_ADMIN_SELECT,
      }),
    ]);
    const totalVolume = totalVolumeResult._sum.price || 0;
    const platformIncome = platformFee(totalVolume);

    return {
      usersCount,
      newUsersToday,
      activeOffersCount,
      totalVolume,
      openDisputesCount,
      pendingCompaniesCount,
      openReportsCount,
      openAppealsCount,
      diagnosticOccurrences: diagnosticOccurrences._sum.occurrences ?? 0,
      platformIncome,
      recentTransactions,
      recentUsers,
    };
  }

  // User Management
  async getAllUsers(page = 1, limit = 20, search = '') {
    page = this.page(page);
    limit = this.limit(limit);
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
        select: USER_ADMIN_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);
    const userIds = users.map((user) => user.id);
    const [reports, rejectedOffers] = userIds.length ? await Promise.all([
      this.prisma.moderationReport.groupBy({ by: ['targetId', 'status'], where: { targetType: { in: ['USER', 'SELLER'] }, targetId: { in: userIds } }, _count: { _all: true } }),
      this.prisma.offer.groupBy({ by: ['sellerId'], where: { sellerId: { in: userIds }, moderationStatus: 'REJECTED' }, _count: { _all: true } }),
    ]) : [[], []];
    const enrichedUsers = users.map((user) => {
      const userReports = reports.filter((item) => item.targetId === user.id);
      const openReports = userReports.filter((item) => ['OPEN', 'REVIEWING'].includes(item.status)).reduce((sum, item) => sum + item._count._all, 0);
      const confirmedReports = userReports.filter((item) => item.status === 'RESOLVED').reduce((sum, item) => sum + item._count._all, 0);
      const rejected = rejectedOffers.find((item) => item.sellerId === user.id)?._count._all ?? 0;
      return { ...user, risk: { score: Math.min(100, openReports * 15 + confirmedReports * 25 + rejected * 10), openReports, confirmedReports, rejectedOffers: rejected } };
    });
    return { users: enrichedUsers, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateUser(
    id: string,
    data: { role?: unknown; tier?: unknown; balance?: unknown; accountStatus?: unknown; suspensionReason?: unknown; suspendedUntil?: unknown },
    adminId: string,
  ) {
    const roles = new Set(['USER', 'VENDOR', 'ADMIN']);
    const tiers = new Set(['SILVER', 'GOLD', 'PLATINUM']);
    const accountStatuses = new Set(['ACTIVE', 'SUSPENDED']);
    if (
      data.role !== undefined &&
      (typeof data.role !== 'string' || !roles.has(data.role))
    ) {
      throw new BadRequestException('Invalid role');
    }
    if (
      data.tier !== undefined &&
      (typeof data.tier !== 'string' || !tiers.has(data.tier))
    ) {
      throw new BadRequestException('Invalid tier');
    }
    if (
      data.balance !== undefined &&
      !isWholeUzsAmount(data.balance, {
        min: 0,
        max: MAX_WALLET_BALANCE_UZS,
      })
    ) {
      throw new BadRequestException(
        `Balance must be a whole UZS amount between 0 and ${MAX_WALLET_BALANCE_UZS.toLocaleString('en-US')}`,
      );
    }
    if (
      data.accountStatus !== undefined &&
      (typeof data.accountStatus !== 'string' || !accountStatuses.has(data.accountStatus))
    ) throw new BadRequestException('Invalid account status');
    if (data.accountStatus === 'SUSPENDED' && (typeof data.suspensionReason !== 'string' || data.suspensionReason.trim().length < 5 || data.suspensionReason.trim().length > 1000)) {
      throw new BadRequestException('Suspension reason must contain 5–1000 characters');
    }
    if (data.suspendedUntil !== undefined && data.suspendedUntil !== null && Number.isNaN(Date.parse(String(data.suspendedUntil)))) {
      throw new BadRequestException('Invalid suspension end date');
    }
    if (id === adminId && data.accountStatus === 'SUSPENDED') {
      throw new BadRequestException('You cannot suspend your own account');
    }
    if (
      data.role === undefined &&
      data.tier === undefined &&
      data.balance === undefined &&
      data.accountStatus === undefined
    ) {
      throw new BadRequestException('No supported user fields supplied');
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id },
        select: { balance: true, accountStatus: true },
      });
      if (!current) throw new NotFoundException('User not found');
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(data.role !== undefined ? { role: data.role as string } : {}),
          ...(data.tier !== undefined ? { tier: data.tier as string } : {}),
          ...(data.balance !== undefined
            ? { balance: data.balance as number }
            : {}),
          ...(data.accountStatus === 'SUSPENDED' ? {
            accountStatus: 'SUSPENDED',
            suspensionReason: (data.suspensionReason as string).trim(),
            suspendedAt: new Date(),
            suspendedUntil: data.suspendedUntil ? new Date(String(data.suspendedUntil)) : null,
            suspendedBy: adminId,
            tokensValidAfter: new Date(),
          } : data.accountStatus === 'ACTIVE' ? {
            accountStatus: 'ACTIVE', suspensionReason: null, suspendedAt: null, suspendedUntil: null, suspendedBy: null,
          } : {}),
        },
        select: USER_ADMIN_SELECT,
      });
      if (data.accountStatus === 'SUSPENDED') {
        await tx.userSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.offer.updateMany({ where: { sellerId: id, isActive: true }, data: { isActive: false } });
      }
      if (data.balance !== undefined && data.balance !== current.balance) {
        await tx.financialEntry.create({
          data: {
            userId: id,
            type: 'ADMIN_BALANCE_ADJUSTMENT',
            amount: (data.balance as number) - current.balance,
            balanceAfter: data.balance as number,
            idempotencyKey: `admin-adjustment:${id}:${randomUUID()}`,
            metadata: JSON.stringify({
              adminId,
              previousBalance: current.balance,
            }),
          },
        });
      }
      await tx.adminLog.create({
        data: {
          adminId,
          action: 'UPDATE_USER',
          targetId: id,
          details: JSON.stringify({
            role: data.role,
            tier: data.tier,
            balance: data.balance,
            previousAccountStatus: current.accountStatus,
            accountStatus: data.accountStatus,
            suspensionReason: data.suspensionReason,
            suspendedUntil: data.suspendedUntil,
          }),
        },
      });
      return user;
    });
  }

  // Offers/Products Management
  async getAllOffers(page = 1, limit = 20, search = '', status = '') {
    page = this.page(page);
    limit = this.limit(limit);
    const skip = (page - 1) * limit;
    const where: Prisma.OfferWhereInput = {};
    const normalizedSearch = search.trim();
    if (normalizedSearch) {
      where.OR = [
        {
          title: {
            contains: normalizedSearch,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          category: {
            contains: normalizedSearch,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          seller: {
            is: {
              OR: [
                {
                  email: {
                    contains: normalizedSearch,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  displayName: {
                    contains: normalizedSearch,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            },
          },
        },
      ];
    }
    const normalizedStatus = status.trim().toUpperCase();
    if (normalizedStatus === 'ACTIVE') where.isActive = true;
    if (normalizedStatus === 'INACTIVE') where.isActive = false;
    if (['PENDING', 'APPROVED', 'REJECTED'].includes(normalizedStatus)) {
      where.moderationStatus = normalizedStatus;
    }
    const [offers, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: ADMIN_OFFER_SELECT,
      }),
      this.prisma.offer.count({ where }),
    ]);
    return { offers, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateOffer(
    id: string,
    data: {
      title?: unknown;
      description?: unknown;
      price?: unknown;
      discountPercent?: unknown;
      category?: unknown;
      isActive?: unknown;
      isFlashDrop?: unknown;
      isExclusive?: unknown;
    },
    adminId: string,
  ) {
    const update: Prisma.OfferUpdateInput = {};
    if (data.title !== undefined) {
      if (typeof data.title !== 'string' || !data.title.trim()) {
        throw new BadRequestException('title is required');
      }
      assertAcceptableUserContent(data.title, 'Offer title');
      update.title = data.title.trim().slice(0, 200);
    }
    if (data.description !== undefined) {
      if (typeof data.description !== 'string' || !data.description.trim()) {
        throw new BadRequestException('description is required');
      }
      assertAcceptableUserContent(data.description, 'Offer description');
      update.description = data.description.trim().slice(0, 5_000);
    }
    if (data.price !== undefined) {
      if (!isValidOfferPriceUzs(data.price)) {
        throw new BadRequestException(
          `price must be 0 or ${MIN_PAID_OFFER_PRICE_UZS.toLocaleString('en-US')}..${MAX_OFFER_PRICE_UZS.toLocaleString('en-US')} UZS`,
        );
      }
      update.price = data.price;
    }
    if (data.discountPercent !== undefined) {
      if (
        typeof data.discountPercent !== 'number' ||
        !Number.isInteger(data.discountPercent) ||
        data.discountPercent < 0 ||
        data.discountPercent > 100
      ) {
        throw new BadRequestException(
          'discountPercent must be an integer between 0 and 100',
        );
      }
      update.discountPercent = data.discountPercent;
    }
    if (data.category !== undefined) {
      if (
        typeof data.category !== 'string' ||
        !/^[A-Z][A-Z0-9_]{1,39}$/.test(data.category.trim().toUpperCase())
      ) {
        throw new BadRequestException('Invalid category');
      }
      update.category = data.category.trim().toUpperCase();
    }
    for (const field of ['isActive', 'isFlashDrop', 'isExclusive'] as const) {
      if (data[field] !== undefined) {
        if (typeof data[field] !== 'boolean') {
          throw new BadRequestException(`${field} must be a boolean`);
        }
        update[field] = data[field];
      }
    }
    if (data.isActive === true) {
      const current = await this.prisma.offer.findUnique({
        where: { id },
        select: { moderationStatus: true },
      });
      if (!current) throw new NotFoundException('Offer not found');
      if (current.moderationStatus !== 'APPROVED') {
        throw new BadRequestException(
          'Only approved offers can be activated',
        );
      }
    }
    if (Object.keys(update).length === 0) {
      throw new BadRequestException('No supported offer fields supplied');
    }
    const offer = await this.prisma.offer.update({
      where: { id },
      data: update,
      select: ADMIN_OFFER_SELECT,
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
    const offer = await this.prisma.offer.update({
      where: { id },
      data: { isActive: false },
    });
    await this.prisma.adminLog.create({
      data: { adminId, action: 'ARCHIVE_OFFER', targetId: id },
    });
    return offer;
  }

  async moderateOffer(
    id: string,
    data: { status?: unknown; note?: unknown },
    adminId: string,
  ) {
    const status =
      typeof data.status === 'string' ? data.status.trim().toUpperCase() : '';
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new BadRequestException(
        'Moderation status must be APPROVED or REJECTED',
      );
    }
    if (data.note !== undefined && typeof data.note !== 'string') {
      throw new BadRequestException('Moderation note must be a string');
    }
    const note = typeof data.note === 'string' ? data.note.trim() : '';
    if (note.length > 2_000) {
      throw new BadRequestException(
        'Moderation note must not exceed 2000 characters',
      );
    }
    if (status === 'REJECTED' && !note) {
      throw new BadRequestException('A rejection reason is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.update({
        where: { id },
        data: {
          moderationStatus: status,
          moderationNote: note || null,
          moderationAt: new Date(),
          moderationBy: adminId,
          isActive: status === 'APPROVED',
        },
        select: ADMIN_OFFER_SELECT,
      });
      await tx.adminLog.create({
        data: {
          adminId,
          action: status === 'APPROVED' ? 'APPROVE_OFFER' : 'REJECT_OFFER',
          targetId: id,
          details: JSON.stringify({ status, note: note || null }),
        },
      });
      return offer;
    });
  }

  // Transactions
  async getAllTransactions(page = 1, limit = 20, status = '', search = '') {
    page = this.page(page);
    limit = this.limit(limit);
    const skip = (page - 1) * limit;
    const where: Prisma.TransactionWhereInput = {};
    if (status.trim()) where.status = status.trim().toUpperCase();
    const normalizedSearch = search.trim();
    if (normalizedSearch) {
      where.OR = [
        {
          offer: {
            is: {
              title: {
                contains: normalizedSearch,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
        {
          buyer: {
            is: {
              email: {
                contains: normalizedSearch,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
      ];
    }
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: USER_ADMIN_SELECT },
          offer: { select: ADMIN_OFFER_SELECT },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { transactions, total, page, totalPages: Math.ceil(total / limit) };
  }

  async refundTransaction(id: string, adminId: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        buyer: { select: USER_ADMIN_SELECT },
        offer: { select: ADMIN_OFFER_SELECT },
      },
    });
    const refundableStatuses = ['COMPLETED', 'PAID', 'ESCROW', 'DISPUTED'];
    if (!tx || !refundableStatuses.includes(tx.status)) {
      throw new NotFoundException('Transaction not valid for refund');
    }

    // Process refund logic using transactions (prisma.$transaction) to ensure atomicity
    await this.prisma.$transaction(async (prisma) => {
      const transition = await prisma.transaction.updateMany({
        where: { id, status: { in: refundableStatuses } },
        data: { status: 'REFUNDED' },
      });
      if (transition.count !== 1) {
        throw new BadRequestException('Transaction was already refunded');
      }

      const buyerCredit = await prisma.user.updateMany({
        where: {
          id: tx.buyerId,
          balance: { lte: MAX_WALLET_BALANCE_UZS - tx.price },
        },
        data: { balance: { increment: tx.price } },
      });
      if (buyerCredit.count !== 1) {
        throw new BadRequestException('Buyer wallet balance limit exceeded');
      }
      const buyer = await prisma.user.findUniqueOrThrow({
        where: { id: tx.buyerId },
        select: { balance: true },
      });
      await prisma.financialEntry.create({
        data: {
          userId: tx.buyerId,
          transactionId: id,
          type: 'ADMIN_REFUND',
          amount: tx.price,
          balanceAfter: buyer.balance,
          idempotencyKey: `admin-refund:${id}`,
          metadata: JSON.stringify({ adminId }),
        },
      });

      if (tx.status === 'COMPLETED' && tx.offer?.sellerId) {
        const payout = sellerPayout(tx.price);
        const currentSeller = await prisma.user.findUniqueOrThrow({
          where: { id: tx.offer.sellerId },
          select: { balance: true },
        });
        const actualReversal = Math.min(payout, currentSeller.balance);
        const seller = await prisma.user.update({
          where: { id: tx.offer.sellerId },
          data: { balance: { decrement: actualReversal } },
          select: { balance: true },
        });
        await prisma.financialEntry.create({
          data: {
            userId: tx.offer.sellerId,
            transactionId: id,
            type: 'ADMIN_PAYOUT_REVERSAL',
            amount: -actualReversal,
            balanceAfter: seller.balance,
            idempotencyKey: `admin-payout-reversal:${id}`,
            metadata: JSON.stringify({
              adminId,
              expectedReversal: payout,
              shortfall: payout - actualReversal,
            }),
          },
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
  async getAllDisputes(page = 1, limit = 20, status = '') {
    page = this.page(page);
    limit = this.limit(limit);
    const skip = (page - 1) * limit;
    const where = status.trim()
      ? { status: status.trim().toUpperCase() }
      : undefined;
    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          transaction: {
            include: {
              buyer: { select: USER_ADMIN_SELECT },
              offer: { select: ADMIN_OFFER_SELECT },
            },
          },
        },
      }),
      this.prisma.dispute.count({ where }),
    ]);
    return { disputes, total, page, totalPages: Math.ceil(total / limit) };
  }

  async resolveDispute(
    id: string,
    resolution: 'BUYER' | 'SELLER',
    adminId: string,
    adminNote?: string,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { transaction: true },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status !== 'OPEN') {
      throw new BadRequestException('Dispute is already resolved');
    }
    if (resolution !== 'BUYER' && resolution !== 'SELLER') {
      throw new BadRequestException('Invalid dispute resolution');
    }

    const normalizedNote = adminNote?.trim().slice(0, 2_000) || null;
    await this.prisma.$transaction(async (prisma) => {
      const transition = await prisma.dispute.updateMany({
        where: { id, status: 'OPEN' },
        data: {
          status: 'RESOLVED',
          resolution,
          adminNote: normalizedNote,
          resolvedBy: adminId,
          resolvedAt: new Date(),
        },
      });
      if (transition.count !== 1) {
        throw new BadRequestException('Dispute is already resolved');
      }

      const tx = dispute.transaction;
      if (resolution === 'BUYER') {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { status: 'REFUNDED' },
        });
        const credited = await prisma.user.updateMany({
          where: {
            id: tx.buyerId,
            balance: { lte: MAX_WALLET_BALANCE_UZS - tx.price },
          },
          data: { balance: { increment: tx.price } },
        });
        if (credited.count !== 1) {
          throw new BadRequestException('Buyer wallet balance limit exceeded');
        }
        const buyer = await prisma.user.findUniqueOrThrow({
          where: { id: tx.buyerId },
          select: { balance: true },
        });
        await prisma.financialEntry.create({
          data: {
            userId: tx.buyerId,
            transactionId: tx.id,
            type: 'ADMIN_DISPUTE_REFUND',
            amount: tx.price,
            balanceAfter: buyer.balance,
            idempotencyKey: `admin-dispute-refund:${id}`,
            metadata: JSON.stringify({ adminId }),
          },
        });
      } else if (resolution === 'SELLER') {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { status: 'COMPLETED' },
        });
        const offer = await prisma.offer.findUnique({
          where: { id: tx.offerId },
        });
        if (offer) {
          const payout = sellerPayout(tx.price);
          const credited = await prisma.user.updateMany({
            where: {
              id: offer.sellerId,
              balance: { lte: MAX_WALLET_BALANCE_UZS - payout },
            },
            data: { balance: { increment: payout } },
          });
          if (credited.count !== 1) {
            throw new BadRequestException(
              'Seller wallet balance limit exceeded',
            );
          }
          const seller = await prisma.user.findUniqueOrThrow({
            where: { id: offer.sellerId },
            select: { balance: true },
          });
          await prisma.financialEntry.create({
            data: {
              userId: offer.sellerId,
              transactionId: tx.id,
              type: 'ADMIN_DISPUTE_PAYOUT',
              amount: payout,
              balanceAfter: seller.balance,
              idempotencyKey: `admin-dispute-payout:${id}`,
              metadata: JSON.stringify({ adminId }),
            },
          });
        }
      }

      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'RESOLVE_DISPUTE',
          targetId: id,
          details: JSON.stringify({ resolution, adminNote: normalizedNote }),
        },
      });
    });

    return {
      message: 'Dispute resolved',
      dispute: await this.prisma.dispute.findUnique({
        where: { id },
        include: {
          transaction: {
            include: {
              buyer: { select: USER_ADMIN_SELECT },
              offer: { select: ADMIN_OFFER_SELECT },
            },
          },
        },
      }),
    };
  }

  async getAdminLogs(page = 1, limit = 50, action = '') {
    page = this.page(page);
    limit = this.limit(limit);
    const skip = (page - 1) * limit;
    const where: Prisma.AdminLogWhereInput = action.trim()
      ? {
          action: {
            contains: action.trim(),
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {};
    const [logs, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminLog.count({ where }),
    ]);
    const adminIds = [...new Set(logs.map((log) => log.adminId))];
    const admins = await this.prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, email: true, displayName: true },
    });
    const adminsById = new Map(admins.map((admin) => [admin.id, admin]));
    return {
      logs: logs.map((log) => ({
        ...log,
        admin: adminsById.get(log.adminId) ?? null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private page(value: number) {
    return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
  }

  private limit(value: number) {
    return Number.isFinite(value)
      ? Math.min(100, Math.max(1, Math.floor(value)))
      : 20;
  }
}
