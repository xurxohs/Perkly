import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

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
  private readonly clickSecretKey = process.env.CLICK_SECRET_KEY || 'sandbox_secret';
  private readonly clickMerchantId = process.env.CLICK_MERCHANT_ID || '12345';
  private readonly clickServiceId = process.env.CLICK_SERVICE_ID || '12345';

  constructor(private prisma: PrismaService) {}

  async createTopUp(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const deposit = await this.prisma.deposit.create({
      data: {
        userId,
        amount,
        provider: 'CLICK',
        status: 'PENDING',
      },
    });

    // Generate Click Payment URL
    const returnUrl = encodeURIComponent('perkly://wallet');
    const paymentUrl = `https://my.click.uz/services/pay?service_id=${this.clickServiceId}&merchant_id=${this.clickMerchantId}&amount=${amount}&transaction_param=${deposit.id}&return_url=${returnUrl}`;

    return { deposit, paymentUrl };
  }

  async processClickWebhook(body: any) {
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
    } = body;

    // 1. Check Signature
    const signString = `${click_trans_id}${service_id}${this.clickSecretKey}${merchant_trans_id}${amount}${action}${sign_time}`;
    const generatedSign = crypto.createHash('md5').update(signString).digest('hex');

    if (generatedSign !== sign_string) {
      this.logger.error('Click sign check failed');
      throw { error: CLICK_ERRORS.SIGN_CHECK_FAILED, message: 'SIGN CHECK FAILED!' };
    }

    // 2. Check Action (0 = Prepare, 1 = Complete)
    if (action !== 0 && action !== 1) {
      throw { error: CLICK_ERRORS.ACTION_NOT_FOUND, message: 'Action not found' };
    }

    // 3. Find Deposit
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: merchant_trans_id },
    });

    if (!deposit) {
      throw { error: CLICK_ERRORS.USER_DOES_NOT_EXIST, message: 'Deposit not found' };
    }

    if (parseFloat(amount) !== deposit.amount) {
      throw { error: CLICK_ERRORS.INCORRECT_AMOUNT, message: 'Incorrect amount' };
    }

    if (deposit.status === 'SUCCESS') {
      throw { error: CLICK_ERRORS.ALREADY_PAID, message: 'Already paid' };
    }

    if (action === 0) {
      // PREPARE
      return {
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id: deposit.id,
        error: CLICK_ERRORS.SUCCESS,
        error_note: 'Success',
      };
    } else if (action === 1) {
      // COMPLETE
      if (error === -1 || error === -5017) {
        // Payment cancelled by user or insufficient funds
        await this.prisma.deposit.update({
          where: { id: deposit.id },
          data: { status: 'FAILED' },
        });
        return {
          click_trans_id,
          merchant_trans_id,
          merchant_confirm_id: deposit.id,
          error: CLICK_ERRORS.TRANSACTION_CANCELLED,
          error_note: 'Cancelled',
        };
      }

      // Success
      await this.prisma.$transaction(async (tx) => {
        await tx.deposit.update({
          where: { id: deposit.id },
          data: {
            status: 'SUCCESS',
            providerId: click_trans_id.toString(),
          },
        });
        await tx.user.update({
          where: { id: deposit.userId },
          data: { balance: { increment: deposit.amount } },
        });
      });

      return {
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: deposit.id,
        error: CLICK_ERRORS.SUCCESS,
        error_note: 'Success',
      };
    }
  }
}
