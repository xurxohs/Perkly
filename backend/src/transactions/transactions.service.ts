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

  async purchase(buyerId: string, offerId: string): Promise<Transaction> {
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

      // Create transaction record
      return tx.transaction.create({
        data: {
          offerId,
          buyerId,
          price: offer.price,
          status: TransactionStatus.ESCROW,
        },
        include: {
          offer: {
            select: { id: true, title: true, category: true, hiddenData: true },
          },
        },
      });
    });

    // Try to notify the buyer via Telegram
    if (buyer.telegramId) {
      const message = `🎉 *Покупка успешна!*\n\nВы приобрели "${offer.title}" за $${offer.price}.\nВаш кэшбек: ${Math.floor(offer.price)} баллов.\n\n🔐 *Ваш товар:*\n\`${offer.hiddenData}\``;
      await this.botService.sendTelegramNotification(buyer.telegramId, message);
    }

    // Try to notify the seller via Telegram
    const seller = await this.prisma.user.findUnique({
      where: { id: offer.sellerId },
    });
    if (seller && seller.telegramId) {
      const message = `💰 *Новая продажа!*\n\nВаш товар "${offer.title}" куплен.\n\n🛡 *Сделка защищена Эскроу.*\nСредства ($${offer.price}) будут зачислены на ваш баланс после того, как покупатель подтвердит получение товара.\n\n_Проверьте вкладку "Заказы" в панели продавца._`;
      await this.botService.sendTelegramNotification(
        seller.telegramId,
        message,
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
}
