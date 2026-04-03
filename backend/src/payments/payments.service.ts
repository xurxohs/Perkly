import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createTopUp(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const deposit = await this.prisma.deposit.create({
      data: {
        userId,
        amount,
        provider: 'MOCK',
        status: 'PENDING',
      },
    });

    // В реальном шлюзе здесь генерируется ссылка на оплату
    const paymentUrl = `/mock-payment?depositId=${deposit.id}&amount=${amount}`;

    return { deposit, paymentUrl };
  }

  async processMockWebhook(depositId: string, success: boolean) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== 'PENDING') {
      throw new BadRequestException('Deposit already processed');
    }

    if (success) {
      // Транзакция: обновить депозит и начислить баланс
      await this.prisma.$transaction([
        this.prisma.deposit.update({
          where: { id: depositId },
          data: { status: 'SUCCESS' },
        }),
        this.prisma.user.update({
          where: { id: deposit.userId },
          data: { balance: { increment: deposit.amount } },
        }),
      ]);
      return { message: 'Payment successful, balance updated' };
    } else {
      // Оплата не прошла
      await this.prisma.deposit.update({
        where: { id: depositId },
        data: { status: 'FAILED' },
      });
      return { message: 'Payment failed' };
    }
  }
}
