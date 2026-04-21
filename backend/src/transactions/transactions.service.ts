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
import { BotService } from '../bot/bot.service';
import { Transaction } from '@prisma/client';
import { SquadsService } from '../squads/squads.service';
import { TransactionStatus } from '../common/enums';

const PROMO_CODES: Record<string, { percent: number; label: string }> = {
  WELCOME10: { percent: 10, label: 'Welcome discount' },
  'PRKLY-GOLD': { percent: 5, label: 'Gold promo' },
  'PRKLY-PLAT': { percent: 10, label: 'Platinum promo' },
  'PRKLY-VIP': { percent: 15, label: 'VIP promo' },
};

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
    @Inject(forwardRef(() => SquadsService))
    private squadsService: SquadsService,
  ) {}

  async purchase(
    buyerId: string,
    offerId: string,
    isGift = false,
    pointsUsed = 0,
    promoCode?: string,
  ): Promise<Transaction> {
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

    const promo = promoCode ? this.validatePromoCode(promoCode, offer.price) : null;
    const promoDiscount = promo?.discountAmount ?? 0;
    const priceAfterPromo = Math.max(0, offer.price - promoDiscount);
    const normalizedPoints = Math.max(0, Math.floor(pointsUsed || 0));
    if (normalizedPoints > buyer.rewardPoints) {
      throw new BadRequestException('Not enough reward points');
    }
    const requestedPointsDiscount = normalizedPoints / 100;
    const maxPointsDiscount = priceAfterPromo * 0.5;
    const pointsDiscount = Math.min(requestedPointsDiscount, maxPointsDiscount);
    const pointsToSpend = Math.floor(pointsDiscount * 100);
    const finalPrice = Number(
      Math.max(0, priceAfterPromo - pointsDiscount).toFixed(2),
    );

    if (buyer.balance < finalPrice) {
      throw new BadRequestException('Insufficient balance');
    }

    // Execute transaction atomically
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Deduct buyer balance
      await tx.user.update({
        where: { id: buyerId },
        data: { balance: { decrement: finalPrice } },
      });

      // Add reward points to buyer (1 point per unit, +15% if squad reward active)
      const extraPoints = buyer.hasSquadReward
        ? Math.floor(finalPrice * 0.15)
        : 0;
      await tx.user.update({
        where: { id: buyerId },
        data: {
          rewardPoints: {
            increment: Math.floor(finalPrice) + extraPoints - pointsToSpend,
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
        ? Math.random().toString(36).substring(2, 10).toUpperCase()
        : null;

      // Create transaction record
      return tx.transaction.create({
        data: {
          offerId,
          buyerId,
          price: finalPrice,
          status: TransactionStatus.ESCROW,
          expiresAt,
          isGift,
          giftCode,
        },
        include: {
          offer: {
            select: { id: true, title: true, category: true, hiddenData: true },
          },
        },
      });
    });

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

    // Try to notify the buyer via Telegram
    if (buyer.telegramId) {
      let message = `🎉 *Покупка успешна!*\n\nВы приобрели "${offer.title}" за $${finalPrice}.\nВаш кэшбек: ${Math.floor(finalPrice)} баллов.`;

      if (isGift) {
        const giftLink = `https://t.me/${process.env.BOT_USERNAME || 'PerklyPlatformBot'}?start=gift_${transaction.giftCode}`;
        message += `\n\n🎁 *Это подарок!*\nВаша ссылка для друга:\n\`${giftLink}\`\n\n_Перешлите это сообщение другу, чтобы он мог забрать товар._`;
      } else {
        message += `\n\n🔐 *Ваш товар:*\n\`${offer.hiddenData}\``;
      }

      await this.botService.sendTelegramNotification(
        buyer.telegramId,
        message,
        inlineKeyboard,
      );
    }

    // Try to notify the seller via Telegram
    const seller = await this.prisma.user.findUnique({
      where: { id: offer.sellerId },
    });
    if (seller && seller.telegramId) {
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
      const message = `💰 *Новая продажа!*\n\nВаш товар "${offer.title}" куплен.\n\n🛡 *Сделка защищена Эскроу.*\nСредства ($${finalPrice}) будут зачислены на ваш баланс после того, как покупатель подтвердит получение товара.\n\n_Проверьте вкладку "Заказы" в панели продавца._`;
      await this.botService.sendTelegramNotification(
        seller.telegramId,
        message,
        sellerKeyboard,
      );
    }

    return transaction;
  }

  validatePromoCode(code: string, amount: number) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    const normalized = code.trim().toUpperCase();
    const promo = PROMO_CODES[normalized];
    if (!promo) {
      throw new BadRequestException('Промокод не найден или истек');
    }

    const discountAmount = Number(((amount * promo.percent) / 100).toFixed(2));

    return {
      code: normalized,
      label: promo.label,
      percent: promo.percent,
      discountAmount,
      finalAmount: Number(Math.max(0, amount - discountAmount).toFixed(2)),
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

    const updatedTx = await this.prisma.$transaction(async (tx) => {
      // Credit seller balance
      await tx.user.update({
        where: { id: transaction.offer.sellerId },
        data: { balance: { increment: transaction.price } },
      });

      // Update tx
      return tx.transaction.update({
        where: { id },
        data: { status: TransactionStatus.COMPLETED },
        include: { offer: true, buyer: true },
      });
    });

    // Notify seller
    const seller = await this.prisma.user.findUnique({
      where: { id: transaction.offer.sellerId },
    });
    if (seller && seller.telegramId) {
      const message = `✅ *Покупатель подтвердил получение!*\n\nСделка по "${transaction.offer.title}" успешно завершена.\nСредства ($${transaction.price}) зачислены на ваш баланс.`;
      await this.botService.sendTelegramNotification(
        seller.telegramId,
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
          offer: {
            select: {
              id: true,
              title: true,
              category: true,
              price: true,
              hiddenData: true,
              sellerId: true,
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { data, total };
  }

  async findOne(id: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        offer: true,
        buyer: { select: { id: true, displayName: true, email: true } },
      },
    });
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
        await tx.user.update({
          where: { id: existing.buyerId },
          data: { balance: { increment: existing.price } },
        });

        if (existing.status === TransactionStatus.COMPLETED) {
          await tx.user.update({
            where: { id: existing.offer.sellerId },
            data: { balance: { decrement: existing.price } },
          });
        }

        return tx.transaction.update({
          where: { id },
          data: { status },
          include: { offer: true, buyer: true },
        });
      });

      if (transaction.buyer.telegramId) {
        const message = `❌ *Заказ отменен*\n\nТранзакция по "${transaction.offer.title}" была отменена. Средства за нее возвращены на ваш баланс.`;
        await this.botService.sendTelegramNotification(
          transaction.buyer.telegramId,
          message,
        );
      }

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
    if (updated.buyer.telegramId) {
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
      await this.botService.sendTelegramNotification(
        updated.buyer.telegramId,
        message,
        keyboard,
      );
    }

    return updated;
  }

  async findSubscriptions(userId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        buyerId: userId,
        expiresAt: { not: null },
      },
      include: { offer: true },
      orderBy: { expiresAt: 'asc' },
    });
  }
}
