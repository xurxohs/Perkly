import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  Prisma,
  Promocode,
  PromocodeActivation,
  Transaction,
} from '@prisma/client';
import { SquadsService } from '../squads/squads.service';
import { TransactionStatus } from '../common/enums';
import {
  PURCHASED_OFFER_SELECT,
  USER_ADMIN_SELECT,
} from '../offers/offer.selects';
import { REWARD_POINT_VALUE_UZS, sellerPayout } from '../common/money';
import { randomBytes } from 'crypto';

type PurchaseOffer = {
  id: string;
  price: number;
  companyId: string | null;
  isActive: boolean;
  sellerId: string;
  title: string;
  hiddenData: string;
  periodDays: number;
};

type AppliedPromocode = {
  activationId: string;
  code: string | null;
  label: string;
  percent: number;
  discountAmount: number;
  finalAmount: number;
};

type ActivationWithPromocode = PromocodeActivation & {
  promocode: Promocode & {
    offer?: Pick<PurchaseOffer, 'id' | 'isActive'> | null;
  };
};

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => SquadsService))
    private squadsService: SquadsService,
  ) {}

  async purchase(
    buyerId: string,
    offerId: string,
    isGift = false,
    pointsUsed = 0,
    promocodeActivationId?: string,
    idempotencyKey?: string,
    buyerComment?: string,
  ): Promise<Transaction> {
    const normalizedBuyerComment = buyerComment?.trim().slice(0, 1000) || null;
    const normalizedIdempotencyKey = idempotencyKey?.trim()
      ? `purchase:${buyerId}:${idempotencyKey.trim().slice(0, 120)}`
      : undefined;
    if (normalizedIdempotencyKey) {
      const existing = await this.prisma.transaction.findUnique({
        where: { idempotencyKey: normalizedIdempotencyKey },
        include: { offer: { select: PURCHASED_OFFER_SELECT } },
      });
      if (existing) return existing;
    }
    // Find offer
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (!offer.isActive) {
      throw new BadRequestException('Offer is no longer active');
    }

    // Prevent self-purchase
    if (offer.sellerId === buyerId) {
      throw new BadRequestException('Cannot purchase your own offer');
    }

    // Check buyer balance
    const buyer = await this.prisma.user.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new NotFoundException('User not found');

    const promo = promocodeActivationId
      ? await this.validatePromocodeActivation(
          buyerId,
          offer,
          promocodeActivationId,
        )
      : null;
    const promoDiscount = promo?.discountAmount ?? 0;
    const priceAfterPromo = Math.max(0, offer.price - promoDiscount);
    const normalizedPoints = Math.max(0, Math.floor(pointsUsed || 0));
    if (normalizedPoints > buyer.rewardPoints) {
      throw new BadRequestException('Not enough reward points');
    }
    const requestedPointsDiscount = normalizedPoints * REWARD_POINT_VALUE_UZS;
    const maxPointsDiscount = priceAfterPromo * 0.5;
    const pointsDiscount = Math.min(requestedPointsDiscount, maxPointsDiscount);
    const pointsToSpend = Math.floor(pointsDiscount / REWARD_POINT_VALUE_UZS);
    const finalPrice = Math.round(
      Math.max(0, priceAfterPromo - pointsDiscount),
    );

    if (buyer.balance < finalPrice) {
      throw new BadRequestException('Insufficient balance');
    }

    // Execute transaction atomically
    let transaction: Transaction;
    try {
      transaction = await this.prisma.$transaction(async (tx) => {
        if (promo) {
          const updatedActivation = await tx.promocodeActivation.updateMany({
            where: {
              id: promo.activationId,
              userId: buyerId,
              status: { in: ['ISSUED', 'COPIED'] },
            },
            data: {
              status: 'USED',
              usedAt: new Date(),
            },
          });

          if (updatedActivation.count !== 1) {
            throw new BadRequestException(
              'Promocode activation is already used',
            );
          }
        }

        // Conditional debit prevents concurrent purchases from making the
        // balance negative after both requests pass the initial read.
        const debit = await tx.user.updateMany({
          where: { id: buyerId, balance: { gte: finalPrice } },
          data: { balance: { decrement: finalPrice } },
        });
        if (debit.count !== 1) {
          throw new BadRequestException('Insufficient balance');
        }

        // Add reward points to buyer (1 point per unit, +15% if squad reward active)
        const baseRewardPoints = Math.floor(finalPrice / 12000);
        const extraPoints = buyer.hasSquadReward
          ? Math.floor(baseRewardPoints * 0.15)
          : 0;
        await tx.user.update({
          where: { id: buyerId },
          data: {
            rewardPoints: {
              increment: baseRewardPoints + extraPoints - pointsToSpend,
            },
            ...(buyer.hasSquadReward ? { hasSquadReward: false } : {}),
          },
        });

        // Calculate expiresAt if the offer has a period
        const expiresAt =
          offer.periodDays > 0
            ? new Date(Date.now() + offer.periodDays * 24 * 60 * 60 * 1000)
            : null;

        // Generate gift code if requested
        const giftCode = isGift
          ? randomBytes(9).toString('base64url').slice(0, 12).toUpperCase()
          : null;

        // Create transaction record
        const created = await tx.transaction.create({
          data: {
            offerId,
            buyerId,
            price: finalPrice,
            status: TransactionStatus.ESCROW,
            expiresAt,
            isGift,
            giftCode,
            promocodeActivationId: promo?.activationId,
            promocodeDiscount: promo?.discountAmount,
            promocodeCodeSnapshot: promo?.code,
            idempotencyKey: normalizedIdempotencyKey,
            buyerComment: normalizedBuyerComment,
          },
          include: {
            offer: { select: PURCHASED_OFFER_SELECT },
          },
        });

        const balance = await tx.user.findUniqueOrThrow({
          where: { id: buyerId },
          select: { balance: true },
        });
        await tx.financialEntry.create({
          data: {
            userId: buyerId,
            transactionId: created.id,
            type: 'PURCHASE_DEBIT',
            amount: -finalPrice,
            balanceAfter: balance.balance,
            idempotencyKey: `purchase-debit:${created.id}`,
            metadata: JSON.stringify({ offerId, isGift }),
          },
        });
        return created;
      });
    } catch (error) {
      if (
        normalizedIdempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.transaction.findUnique({
          where: { idempotencyKey: normalizedIdempotencyKey },
          include: { offer: { select: PURCHASED_OFFER_SELECT } },
        });
        if (existing) return existing;
      }
      throw error;
    }

    const webAppUrl = process.env.FRONTEND_URL || 'https://perkly.uz';
    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: '🔥 Открыть Заказ',
            web_app: { url: `${webAppUrl}/profile/orders` },
          },
        ],
      ],
    };

    // Try to notify the buyer
    let message = `🎉 *Покупка успешна!*\n\nВы приобрели "${offer.title}" за ${finalPrice.toLocaleString('ru-RU')} сум.`;
    if (promo) {
      message += `\nПромокод: ${promo.label} (-${promo.discountAmount.toLocaleString('ru-RU')} сум).`;
    }
    message += `\nВаш кэшбек: ${Math.floor(finalPrice)} баллов.`;

    if (isGift) {
      const giftLink = `https://t.me/${process.env.BOT_USERNAME || 'PerklyPlatformBot'}?start=gift_${transaction.giftCode}`;
      message += `\n\n🎁 *Это подарок!*\nВаша ссылка для друга:\n\`${giftLink}\`\n\n_Перешлите это сообщение другу, чтобы он мог забрать товар._`;
    } else {
      message += `\n\n🔐 *Ваш товар:*\n\`${offer.hiddenData}\``;
    }

    await this.notificationsService.sendPushNotification(
      buyer.id,
      '🎉 Покупка успешна!',
      message,
      { keyboard: inlineKeyboard },
    );

    // Try to notify the seller
    const seller = await this.prisma.user.findUnique({
      where: { id: offer.sellerId },
    });
    if (seller) {
      const sellerKeyboard = {
        inline_keyboard: [
          [
            {
              text: '📦 Управление Заказами',
              web_app: { url: `${webAppUrl}/vendor/orders` },
            },
          ],
        ],
      };
      const message = `💰 *Новая продажа!*\n\nВаш товар "${offer.title}" куплен.\n\n🛡 *Сделка защищена Эскроу.*\nСредства (${finalPrice.toLocaleString('ru-RU')} сум) будут зачислены на ваш баланс после того, как покупатель подтвердит получение товара.\n\n_Проверьте вкладку "Заказы" в панели продавца._`;
      await this.notificationsService.sendPushNotification(
        seller.id,
        '💰 Новая продажа!',
        message,
        { keyboard: sellerKeyboard },
      );
    }

    return transaction;
  }

  async validatePromoCode(
    userId: string,
    code: string,
    amount: number,
    offerId?: string,
  ) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Промокод не найден или истек');
    }

    const activation = await this.prisma.promocodeActivation.findFirst({
      where: {
        userId,
        status: { in: ['ISSUED', 'COPIED'] },
        OR: [{ codeSnapshot: normalized }, { promocode: { code: normalized } }],
      },
      include: {
        promocode: {
          include: {
            offer: { select: { id: true, isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activation) {
      throw new BadRequestException('Промокод не найден или истек');
    }

    const offer = offerId
      ? await this.prisma.offer.findUnique({
          where: { id: offerId },
          select: {
            id: true,
            price: true,
            companyId: true,
            isActive: true,
            sellerId: true,
            title: true,
            hiddenData: true,
            periodDays: true,
          },
        })
      : null;

    if (offer) {
      return this.validatePromocodeActivationForOffer(
        activation as ActivationWithPromocode,
        offer,
        amount,
      );
    }

    this.ensureActivationUsableForPurchase(
      activation as ActivationWithPromocode,
    );

    return this.buildAppliedPromocode(
      activation as ActivationWithPromocode,
      amount,
    );
  }

  private async validatePromocodeActivation(
    userId: string,
    offer: PurchaseOffer,
    activationId: string,
  ): Promise<AppliedPromocode> {
    const activation = await this.prisma.promocodeActivation.findUnique({
      where: { id: activationId },
      include: {
        promocode: {
          include: {
            offer: { select: { id: true, isActive: true } },
          },
        },
      },
    });

    if (!activation) {
      throw new NotFoundException('Promocode activation not found');
    }
    if (activation.userId !== userId) {
      throw new ForbiddenException('You cannot use this promocode activation');
    }

    return this.validatePromocodeActivationForOffer(
      activation as ActivationWithPromocode,
      offer,
      offer.price,
    );
  }

  private validatePromocodeActivationForOffer(
    activation: ActivationWithPromocode,
    offer: PurchaseOffer,
    amount: number,
  ): AppliedPromocode {
    this.ensureActivationUsableForPurchase(activation);

    if (activation.offerId && activation.offerId !== offer.id) {
      throw new BadRequestException('Promocode is not valid for this offer');
    }

    if (
      activation.promocode.offerId &&
      activation.promocode.offerId !== offer.id
    ) {
      throw new BadRequestException('Promocode is not valid for this offer');
    }

    if (!activation.promocode.offerId) {
      if (
        !offer.companyId ||
        activation.promocode.companyId !== offer.companyId
      ) {
        throw new BadRequestException('Promocode is not valid for this offer');
      }
    }

    return this.buildAppliedPromocode(activation, amount);
  }

  private ensureActivationUsableForPurchase(
    activation: ActivationWithPromocode,
  ) {
    if (activation.status === 'USED') {
      throw new BadRequestException('Promocode activation is already used');
    }
    if (activation.expiresAt && activation.expiresAt < new Date()) {
      throw new BadRequestException('Promocode activation is expired');
    }
    if (activation.promocode.status !== 'ACTIVE') {
      throw new BadRequestException('Promocode is not active');
    }
    if (activation.promocode.offer && !activation.promocode.offer.isActive) {
      throw new BadRequestException('Promocode offer is not active');
    }

    const now = new Date();
    if (
      activation.promocode.validFrom &&
      activation.promocode.validFrom > now
    ) {
      throw new BadRequestException('Promocode is not active yet');
    }
    if (activation.promocode.validTo && activation.promocode.validTo < now) {
      throw new BadRequestException('Promocode is expired');
    }
  }

  private buildAppliedPromocode(
    activation: ActivationWithPromocode,
    amount: number,
  ): AppliedPromocode {
    const percent = Number(activation.promocode.discountValue);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      throw new BadRequestException('Promocode discount is invalid');
    }

    const discountAmount = Math.round((amount * percent) / 100);

    return {
      activationId: activation.id,
      code: activation.codeSnapshot ?? activation.promocode.code,
      label: activation.promocode.title,
      percent,
      discountAmount,
      finalAmount: Math.round(Math.max(0, amount - discountAmount)),
    };
  }

  async confirmDelivery(id: string, buyerId: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { offer: true },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.buyerId !== buyerId)
      throw new BadRequestException('Only the buyer can confirm delivery');
    if (transaction.status !== (TransactionStatus.ESCROW as string))
      throw new BadRequestException('Transaction is not in escrow');

    const payout = sellerPayout(transaction.price);
    const updatedTx = await this.prisma.$transaction(async (tx) => {
      const transition = await tx.transaction.updateMany({
        where: { id, status: TransactionStatus.ESCROW },
        data: { status: TransactionStatus.COMPLETED },
      });
      if (transition.count !== 1) {
        throw new BadRequestException('Transaction is no longer in escrow');
      }

      // Credit seller balance
      const seller = await tx.user.update({
        where: { id: transaction.offer.sellerId },
        data: { balance: { increment: payout } },
        select: { balance: true },
      });

      // Update tx
      const completed = await tx.transaction.findUniqueOrThrow({
        where: { id },
        include: { offer: true, buyer: true },
      });
      await tx.financialEntry.create({
        data: {
          userId: transaction.offer.sellerId,
          transactionId: id,
          type: 'ESCROW_RELEASE',
          amount: payout,
          balanceAfter: seller.balance,
          idempotencyKey: `escrow-release:${id}`,
        },
      });
      return completed;
    });

    // Notify seller
    const seller = await this.prisma.user.findUnique({
      where: { id: transaction.offer.sellerId },
    });
    if (seller) {
      const message = `✅ *Покупатель подтвердил получение!*\n\nСделка по "${transaction.offer.title}" успешно завершена.\nСредства (${payout.toLocaleString('ru-RU')} сум) зачислены на ваш баланс.`;
      await this.notificationsService.sendPushNotification(
        seller.id,
        '✅ Покупатель подтвердил получение!',
        message,
      );
    }

    // Trigger squad goal check if buyer is in a squad
    if (updatedTx.buyer.squadId) {
      await this.squadsService.checkAndTriggerRewards(updatedTx.buyer.squadId);
    }

    return updatedTx;
  }

  async findByBuyer(
    buyerId: string,
    skip = 0,
    take = 20,
  ): Promise<{ data: Transaction[]; total: number }> {
    const where = { buyerId };
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          offer: { select: PURCHASED_OFFER_SELECT },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { data, total };
  }

  async findOne(
    id: string,
    actor: { userId: string; role?: string },
  ): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        offer: { select: PURCHASED_OFFER_SELECT },
        buyer: { select: USER_ADMIN_SELECT },
      },
    });

    if (!transaction) return null;

    const actorUser = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      select: { role: true },
    });

    if (!actorUser) {
      throw new ForbiddenException('You cannot access this transaction');
    }

    const isBuyer = transaction.buyerId === actor.userId;
    const isSeller = transaction.offer.sellerId === actor.userId;
    const isAdmin = actorUser.role === 'ADMIN';

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new ForbiddenException('You cannot access this transaction');
    }

    return transaction as unknown as Transaction;
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
    actorId: string,
  ): Promise<Transaction> {
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
      include: { offer: true, buyer: true },
    });
    if (!existing) throw new NotFoundException('Transaction not found');

    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!actor) throw new NotFoundException('User not found');

    const isAdmin = actor.role === 'ADMIN';
    const isSeller = existing.offer.sellerId === actorId;

    if (!isAdmin && !isSeller) {
      throw new ForbiddenException('Only seller or admin can update status');
    }

    if (status !== TransactionStatus.CANCELLED && !isAdmin) {
      throw new ForbiddenException('Only admin can set this status');
    }

    if (status === TransactionStatus.CANCELLED) {
      if (
        existing.status === TransactionStatus.CANCELLED ||
        existing.status === TransactionStatus.DISPUTED
      ) {
        throw new BadRequestException('Transaction cannot be cancelled');
      }

      const transaction = await this.prisma.$transaction(async (tx) => {
        const buyer = await tx.user.update({
          where: { id: existing.buyerId },
          data: { balance: { increment: existing.price } },
          select: { balance: true },
        });
        await tx.financialEntry.create({
          data: {
            userId: existing.buyerId,
            transactionId: id,
            type: 'PURCHASE_REFUND',
            amount: existing.price,
            balanceAfter: buyer.balance,
            idempotencyKey: `purchase-refund:${id}`,
          },
        });

        if (existing.status === TransactionStatus.COMPLETED) {
          const payout = sellerPayout(existing.price);
          const seller = await tx.user.update({
            where: { id: existing.offer.sellerId },
            data: { balance: { decrement: payout } },
            select: { balance: true },
          });
          await tx.financialEntry.create({
            data: {
              userId: existing.offer.sellerId,
              transactionId: id,
              type: 'SELLER_PAYOUT_REVERSAL',
              amount: -payout,
              balanceAfter: seller.balance,
              idempotencyKey: `seller-payout-reversal:${id}`,
            },
          });
        }

        return tx.transaction.update({
          where: { id },
          data: { status },
          include: { offer: true, buyer: true },
        });
      });

      const message = `❌ *Заказ отменен*\n\nТранзакция по "${transaction.offer.title}" была отменена. Средства за нее возвращены на ваш баланс.`;
      await this.notificationsService.sendPushNotification(
        existing.buyerId,
        '❌ Заказ отменен',
        message,
      );

      return transaction;
    }

    return this.prisma.transaction.update({
      where: { id },
      data: { status },
      include: { offer: true, buyer: true },
    });
  }

  async redeemGift(code: string, userId: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { giftCode: code.toUpperCase() },
      include: { offer: true },
    });

    if (!transaction) throw new NotFoundException('Подарочный код не найден');
    if (!transaction.isGift)
      throw new BadRequestException('Этот код не является подарком');
    if (transaction.isRedeemed)
      throw new BadRequestException('Этот подарок уже активирован');
    if (transaction.buyerId === userId)
      throw new BadRequestException(
        'Вы не можете активировать собственный подарок',
      );

    const updated = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        buyerId: userId,
        isRedeemed: true,
      },
      include: { offer: true, buyer: true },
    });

    // Notify the redeemer
    const webAppUrl = process.env.FRONTEND_URL || 'https://perkly.uz';
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🔥 Посмотреть товар',
            web_app: { url: `${webAppUrl}/profile/orders` },
          },
        ],
      ],
    };
    const message = `🎁 *Подарок активирован!*\n\nВы получили "${updated.offer.title}".\n\n🔐 *Ваш товар:*\n\`${updated.offer.hiddenData}\``;
    await this.notificationsService.sendPushNotification(
      updated.buyer.id,
      '🎁 Подарок активирован!',
      message,
      { keyboard },
    );

    return updated;
  }

  async findSubscriptions(userId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        buyerId: userId,
        expiresAt: { not: null },
      },
      include: { offer: { select: PURCHASED_OFFER_SELECT } },
      orderBy: { expiresAt: 'asc' },
    });
  }
}
