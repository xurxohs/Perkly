import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import {
  isWholeUzsAmount,
  MAX_TOP_UP_UZS,
  MAX_WALLET_BALANCE_UZS,
  MIN_TOP_UP_UZS,
} from '../common/money';
import { NotificationsService } from '../notifications/notifications.service';

// Click Webhook Error Codes
const CLICK_ERRORS = {
  SUCCESS: 0,
  SIGN_CHECK_FAILED: -1,
  INCORRECT_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  USER_DOES_NOT_EXIST: -5,
  TRANSACTION_DOES_NOT_EXIST: -6,
  UPDATE_FAILED: -7,
  REQUEST_ERROR: -8,
  TRANSACTION_CANCELLED: -9,
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly clickSecretKey =
    process.env.CLICK_SECRET_KEY || 'sandbox_secret';
  private readonly clickMerchantId = process.env.CLICK_MERCHANT_ID || '12345';
  private readonly clickServiceId = process.env.CLICK_SERVICE_ID || '12345';

  constructor(
    private prisma: PrismaService,
    @Optional()
    private notifications?: NotificationsService,
  ) {}

  async getDeposit(userId: string, depositId: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });
    if (!deposit) throw new NotFoundException('Deposit not found');
    if (deposit.userId !== userId) {
      throw new ForbiddenException('Deposit does not belong to this user');
    }
    return deposit;
  }

  async createTopUp(userId: string, amount: number, idempotencyKey?: string) {
    if (
      !isWholeUzsAmount(amount, {
        min: MIN_TOP_UP_UZS,
        max: MAX_TOP_UP_UZS,
      })
    ) {
      throw new BadRequestException(
        `Amount must be an integer between ${MIN_TOP_UP_UZS.toLocaleString('en-US')} and ${MAX_TOP_UP_UZS.toLocaleString('en-US')} UZS`,
      );
    }
    if (
      process.env.NODE_ENV === 'production' &&
      (!process.env.CLICK_SECRET_KEY ||
        !process.env.CLICK_MERCHANT_ID ||
        !process.env.CLICK_SERVICE_ID)
    ) {
      throw new BadRequestException('Click merchant is not configured');
    }

    const normalizedKey = idempotencyKey?.trim()
      ? `topup:${userId}:${idempotencyKey.trim().slice(0, 120)}`
      : undefined;
    if (normalizedKey) {
      const existing = await this.prisma.deposit.findUnique({
        where: { idempotencyKey: normalizedKey },
      });
      if (existing) return this.topUpResponse(existing, amount);
    }

    const deposit = await this.prisma.deposit.create({
      data: {
        userId,
        amount,
        provider: 'CLICK',
        status: 'PENDING',
        idempotencyKey: normalizedKey,
      },
    });

    return this.topUpResponse(deposit, amount);
  }

  private topUpResponse(deposit: { id: string }, amount: number) {
    // Generate Click Payment URL
    const query = new URLSearchParams({
      service_id: this.clickServiceId,
      merchant_id: this.clickMerchantId,
      amount: amount.toFixed(2),
      transaction_param: deposit.id,
      return_url: process.env.CLICK_RETURN_URL || 'perkly://wallet',
    });
    const paymentUrl = `https://my.click.uz/services/pay?${query.toString()}`;

    return { deposit, paymentUrl };
  }

  async mockCompleteTopUp(userId: string, depositId: string, success: boolean) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Mock payments are disabled in production');
    }

    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.userId !== userId) {
      throw new ForbiddenException('Deposit does not belong to this user');
    }

    if (deposit.status !== 'PENDING') {
      throw new BadRequestException('Deposit is already processed');
    }

    if (!success) {
      const failed = await this.prisma.deposit.update({
        where: { id: deposit.id },
        data: { status: 'FAILED' },
      });
      await this.notifyTopUp(deposit.userId, deposit.amount, false, deposit.id);
      return failed;
    }

    const completed = await this.prisma.$transaction(async (tx) => {
      const updatedDeposit = await tx.deposit.update({
        where: { id: deposit.id },
        data: {
          status: 'SUCCESS',
          providerId: `mock_${deposit.id}`,
        },
      });
      const credited = await tx.user.updateMany({
        where: {
          id: userId,
          balance: { lte: MAX_WALLET_BALANCE_UZS - deposit.amount },
        },
        data: { balance: { increment: deposit.amount } },
      });
      if (credited.count !== 1) {
        throw new BadRequestException('Wallet balance limit exceeded');
      }
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { balance: true },
      });
      await tx.financialEntry.create({
        data: {
          userId,
          depositId: deposit.id,
          type: 'TOPUP_CREDIT',
          amount: deposit.amount,
          balanceAfter: user.balance,
          idempotencyKey: `topup-credit:${deposit.id}`,
          metadata: JSON.stringify({ provider: 'MOCK' }),
        },
      });
      return updatedDeposit;
    });
    await this.notifyTopUp(userId, deposit.amount, true, deposit.id);
    return completed;
  }

  async processClickWebhook(body: any) {
    if (
      process.env.NODE_ENV === 'production' &&
      (!process.env.CLICK_SECRET_KEY ||
        !process.env.CLICK_MERCHANT_ID ||
        !process.env.CLICK_SERVICE_ID)
    ) {
      this.logger.error('Click webhook rejected: merchant is not configured');
      throw {
        error: CLICK_ERRORS.REQUEST_ERROR,
        message: 'Payment provider is not configured',
      };
    }
    const {
      click_trans_id,
      service_id,
      click_paydoc_id,
      merchant_trans_id,
      amount,
      action,
      error,
      error_note,
      sign_time,
      sign_string,
      merchant_prepare_id,
    } = body;

    const parsedAction = Number(action);
    const parsedError = Number(error);
    const parsedAmount = Number(amount);

    if (String(service_id) !== this.clickServiceId) {
      throw {
        error: CLICK_ERRORS.REQUEST_ERROR,
        message: 'Incorrect service_id',
      };
    }

    // 1. Check Signature
    const signString = `${click_trans_id}${service_id}${this.clickSecretKey}${merchant_trans_id}${amount}${action}${sign_time}`;
    const generatedSign = crypto
      .createHash('md5')
      .update(signString)
      .digest('hex');

    const expected = Buffer.from(generatedSign, 'utf8');
    const received = Buffer.from(
      String(sign_string || '').toLowerCase(),
      'utf8',
    );
    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      this.logger.error('Click sign check failed');
      throw {
        error: CLICK_ERRORS.SIGN_CHECK_FAILED,
        message: 'SIGN CHECK FAILED!',
      };
    }

    // 2. Check Action (0 = Prepare, 1 = Complete)
    if (parsedAction !== 0 && parsedAction !== 1) {
      throw {
        error: CLICK_ERRORS.ACTION_NOT_FOUND,
        message: 'Action not found',
      };
    }

    // 3. Find Deposit
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: merchant_trans_id },
    });

    if (!deposit) {
      throw {
        error: CLICK_ERRORS.USER_DOES_NOT_EXIST,
        message: 'Deposit not found',
      };
    }

    if (
      !isWholeUzsAmount(parsedAmount, {
        min: MIN_TOP_UP_UZS,
        max: MAX_TOP_UP_UZS,
      }) ||
      parsedAmount !== deposit.amount
    ) {
      throw {
        error: CLICK_ERRORS.INCORRECT_AMOUNT,
        message: 'Incorrect amount',
      };
    }

    if (deposit.status === 'SUCCESS') {
      throw { error: CLICK_ERRORS.ALREADY_PAID, message: 'Already paid' };
    }

    if (parsedAction === 0) {
      // PREPARE
      return {
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id: deposit.id,
        error: CLICK_ERRORS.SUCCESS,
        error_note: 'Success',
      };
    } else if (parsedAction === 1) {
      if (merchant_prepare_id && String(merchant_prepare_id) !== deposit.id) {
        throw {
          error: CLICK_ERRORS.TRANSACTION_DOES_NOT_EXIST,
          message: 'Prepare transaction not found',
        };
      }
      // COMPLETE
      if (parsedError !== 0) {
        await this.prisma.deposit.update({
          where: { id: deposit.id },
          data: { status: 'FAILED' },
        });
        await this.notifyTopUp(deposit.userId, deposit.amount, false, deposit.id);
        return {
          click_trans_id,
          merchant_trans_id,
          merchant_confirm_id: deposit.id,
          error: CLICK_ERRORS.TRANSACTION_CANCELLED,
          error_note: 'Cancelled',
        };
      }

      // Success
      const completed = await this.prisma.$transaction(async (tx) => {
        const update = await tx.deposit.updateMany({
          where: { id: deposit.id, status: 'PENDING' },
          data: {
            status: 'SUCCESS',
            providerId: click_trans_id.toString(),
          },
        });
        if (update.count !== 1) return false;
        const credited = await tx.user.updateMany({
          where: {
            id: deposit.userId,
            balance: { lte: MAX_WALLET_BALANCE_UZS - deposit.amount },
          },
          data: { balance: { increment: deposit.amount } },
        });
        if (credited.count !== 1) {
          throw {
            error: CLICK_ERRORS.UPDATE_FAILED,
            message: 'Wallet balance limit exceeded',
          };
        }
        const user = await tx.user.findUniqueOrThrow({
          where: { id: deposit.userId },
          select: { balance: true },
        });
        await tx.financialEntry.create({
          data: {
            userId: deposit.userId,
            depositId: deposit.id,
            type: 'TOPUP_CREDIT',
            amount: deposit.amount,
            balanceAfter: user.balance,
            idempotencyKey: `topup-credit:${deposit.id}`,
            metadata: JSON.stringify({
              provider: 'CLICK',
              clickTransId: String(click_trans_id),
            }),
          },
        });
        return true;
      });

      if (!completed) {
        throw { error: CLICK_ERRORS.ALREADY_PAID, message: 'Already paid' };
      }

      await this.notifyTopUp(deposit.userId, deposit.amount, true, deposit.id);

      return {
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: deposit.id,
        error: CLICK_ERRORS.SUCCESS,
        error_note: 'Success',
      };
    }
  }

  private async notifyTopUp(userId: string, amount: number, success: boolean, depositId: string) {
    await this.notifications?.sendPushNotification(
      userId,
      success ? 'Баланс пополнен' : 'Платёж не завершён',
      success
        ? `${amount.toLocaleString('ru-RU')} сум зачислено на баланс Perkly.`
        : `Пополнение на ${amount.toLocaleString('ru-RU')} сум отменено или не прошло.`,
      { depositId, paymentStatus: success ? 'SUCCESS' : 'FAILED' },
      'purchases',
    );
  }
}
