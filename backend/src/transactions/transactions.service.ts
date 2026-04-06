import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from '../bot/bot.service';
import { Transaction } from '@prisma/client';
import { TransactionStatus } from '../common/enums';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private prisma: PrismaService,
    private botService: BotService,
  ) {}

  async purchase(
    buyerId: string,
    offerId: string,
    isGift = false,
  ): Promise<Transaction> {
    // Find offer
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (!offer.isActive)
      throw new BadRequestException('Offer is no longer active');

    // Prevent self-purchase
    if (offer.sellerId === buyerId) {
      throw new BadRequestException('Cannot purchase your own offer');
    }

    // Check buyer balance
    const buyer = await this.prisma.user.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new NotFoundException('User not found');
    if (buyer.balance < offer.price) {
      throw new BadRequestException('Insufficient balance');
    }

    // Execute transaction atomically
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Deduct buyer balance
      await tx.user.update({
        where: { id: buyerId },
        data: { balance: { decrement: offer.price } },
      });

      // Add reward points to buyer (1 point per $1)
      await tx.user.update({
        where: { id: buyerId },
        data: { rewardPoints: { increment: Math.floor(offer.price) } },
      });

      // Calculate expiresAt if the offer has a period
      const expiresAt = offer.periodDays > 0 
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
          price: offer.price,
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
        [{ text: '🔥 Открыть Заказ', web_app: { url: `${webAppUrl}/profile/orders` } }]
      ]
    };

    // Try to notify the buyer via Telegram
    if (buyer.telegramId) {
      let message = `🎉 *Покупка успешна!*\n\nВы приобрели "${offer.title}" за $${offer.price}.\nВаш кэшбек: ${Math.floor(offer.price)} баллов.`;
      
      if (isGift) {
        const giftLink = `https://t.me/${process.env.BOT_USERNAME || 'PerklyPlatformBot'}?start=gift_${transaction.giftCode}`;
        message += `\n\n🎁 *Это подарок!*\nВаша ссылка для друга:\n\`${giftLink}\`\n\n_Перешлите это сообщение другу, чтобы он мог забрать товар._`;
      } else {
        message += `\n\n🔐 *Ваш товар:*\n\`${offer.hiddenData}\``;
      }
      
      await this.botService.sendTelegramNotification(buyer.telegramId, message, inlineKeyboard);
    }

    // Try to notify the seller via Telegram
    const seller = await this.prisma.user.findUnique({
      where: { id: offer.sellerId },
    });
    if (seller && seller.telegramId) {
      const sellerKeyboard = {
        inline_keyboard: [
          [{ text: '📦 Управление Заказами', web_app: { url: `${webAppUrl}/vendor/orders` } }]
        ]
      };
      const message = `💰 *Новая продажа!*\n\nВаш товар "${offer.title}" куплен.\n\n🛡 *Сделка защищена Эскроу.*\nСредства ($${offer.price}) будут зачислены на ваш баланс после того, как покупатель подтвердит получение товара.\n\n_Проверьте вкладку "Заказы" в панели продавца._`;
      await this.botService.sendTelegramNotification(
        seller.telegramId,
        message,
        sellerKeyboard
      );
    }

    return transaction;
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
  ): Promise<Transaction> {
    const transaction = await this.prisma.transaction.update({
      where: { id },
      data: { status },
      include: { offer: true, buyer: true },
    });

    // Try to notify the buyer via Telegram about status changes
    if (
      transaction.buyer.telegramId &&
      status === TransactionStatus.CANCELLED
    ) {
      const message = `❌ *Заказ отменен*\n\nТранзакция по "${transaction.offer.title}" была отменена. Средства за нее возвращены на ваш баланс.`;
      await this.botService.sendTelegramNotification(
        transaction.buyer.telegramId,
        message,
      );
    }

    return transaction;
  }

  async redeemGift(code: string, userId: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { giftCode: code.toUpperCase() },
      include: { offer: true },
    });

    if (!transaction) throw new NotFoundException('Подарочный код не найден');
    if (!transaction.isGift) throw new BadRequestException('Этот код не является подарком');
    if (transaction.isRedeemed) throw new BadRequestException('Этот подарок уже активирован');
    if (transaction.buyerId === userId) throw new BadRequestException('Вы не можете активировать собственный подарок');

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
          [{ text: '🔥 Посмотреть товар', web_app: { url: `${webAppUrl}/profile/orders` } }]
        ]
      };
      const message = `🎁 *Подарок активирован!*\n\nВы получили "${updated.offer.title}".\n\n🔐 *Ваш товар:*\n\`${updated.offer.hiddenData}\``;
      await this.botService.sendTelegramNotification(updated.buyer.telegramId, message, keyboard);
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
