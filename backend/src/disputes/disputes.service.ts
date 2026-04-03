import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from '../bot/bot.service';
import { DisputeStatus, TransactionStatus } from '../common/enums';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    private prisma: PrismaService,
    private botService: BotService,
  ) {}

  async create(transactionId: string, buyerId: string, reason: string) {
    // Find transaction
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { offer: true },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.buyerId !== buyerId)
      throw new ForbiddenException('Only the buyer can open a dispute');

    // Cannot dispute a cancelled transaction
    if ((transaction.status as unknown) === TransactionStatus.CANCELLED) {
      throw new BadRequestException('Cannot dispute a cancelled transaction');
    }

    // Check if dispute already exists
    const existingDispute = await this.prisma.dispute.findUnique({
      where: { transactionId },
    });
    if (existingDispute)
      throw new BadRequestException(
        'Dispute already exists for this transaction',
      );

    const resultDispute = await this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.create({
        data: {
          transactionId,
          reason,
          status: DisputeStatus.OPEN,
        },
      });

      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: TransactionStatus.DISPUTED },
      });

      // Auto-create a Dispute ChatRoom for both parties
      await tx.chatRoom.create({
        data: {
          type: 'DISPUTE',
          transactionId,
          participants: {
            connect: [{ id: buyerId }, { id: transaction.offer.sellerId }],
          },
        },
      });

      return dispute;
    });

    // Notify seller
    const seller = await this.prisma.user.findUnique({
      where: { id: transaction.offer.sellerId },
    });
    if (seller && seller.telegramId) {
      const message = `⚠️ *Открыт спор!*\n\nПокупатель открыл спор по вашему товару "${transaction.offer.title}".\nПричина: _${reason}_\n\nПожалуйста, перейдите в чат спора, чтобы решить проблему.`;
      await this.botService.sendTelegramNotification(
        seller.telegramId,
        message,
      );
    }

    return resultDispute;
  }

  async findOne(id: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        transaction: { include: { offer: true, buyer: true } },
      },
    });

    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  async findAllForAdmin() {
    return this.prisma.dispute.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        transaction: { include: { offer: true } },
      },
    });
  }

  // addMessage method was removed - handled by ChatModule

  async resolveDispute(
    disputeId: string,
    resolverId: string,
    resolution: DisputeStatus.RESOLVED | DisputeStatus.CLOSED,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { transaction: { include: { offer: true } } },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');

    // Only admin or seller can resolve (we will enforce this in the controller)

    await this.prisma.$transaction(async (tx) => {
      const updatedDispute = await tx.dispute.update({
        where: { id: disputeId },
        data: { status: resolution },
      });

      // Update transaction status depending on resolution
      const newTxStatus =
        resolution === DisputeStatus.RESOLVED
          ? TransactionStatus.COMPLETED
          : TransactionStatus.CANCELLED; // Assuming CLOSED means refund or cancel

      await tx.transaction.update({
        where: { id: dispute.transactionId },
        data: { status: newTxStatus },
      });

      // If cancelled, we should also revert balances (buyer +price, seller -price)
      if (newTxStatus === TransactionStatus.CANCELLED) {
        await tx.user.update({
          where: { id: dispute.transaction.buyerId },
          data: { balance: { increment: dispute.transaction.price } },
        });
        await tx.user.update({
          where: { id: dispute.transaction.offer.sellerId },
          data: { balance: { decrement: dispute.transaction.price } },
        });
      }

      // 1. Return the result of the transaction (which is the updated dispute)
      return updatedDispute;
    });

    // 2. Fetch the updated transaction with necessary details for notification
    const finalDispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { transaction: { include: { offer: true, buyer: true } } },
    });

    const buyer = finalDispute?.transaction?.buyer as
      | { telegramId?: string }
      | undefined
      | null;
    const offer = finalDispute?.transaction?.offer as
      | { title?: string }
      | undefined
      | null;

    if (buyer?.telegramId) {
      const resultText =
        resolution === DisputeStatus.RESOLVED
          ? '✅ К сожалению/счастью, спор решен в пользу продавца. Средства переведены продавцу.'
          : '💸 Спор закрыт. Средства возвращены на ваш баланс!';

      const message = `⚖️ *Решение по спору*\nОтносительно покупки "${offer?.title ?? 'Товар'}":\n\n${resultText}`;

      try {
        await this.botService.sendTelegramNotification(
          String(buyer.telegramId),
          message,
        );
      } catch (err) {
        this.logger.error('Failed to send telegram notification', err);
      }
    }

    return await this.prisma.dispute.findUniqueOrThrow({
      where: { id: disputeId },
    });
  }
}
