import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { AuthGuard } from '@nestjs/passport';
import { TransactionStatus } from '../common/enums';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async purchase(
    @Request() req: { user: { userId: string } },
    @Body()
    body: {
      offerId: string;
      isGift?: boolean;
      pointsUsed?: number;
      promocodeActivationId?: string;
      idempotencyKey?: string;
      buyerComment?: string;
    },
  ) {
    return this.transactionsService.purchase(
      req.user.userId,
      body.offerId,
      body.isGift,
      body.pointsUsed ?? 0,
      body.promocodeActivationId,
      body.idempotencyKey,
      body.buyerComment,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('promo/validate')
  validatePromo(
    @Request() req: { user: { userId: string } },
    @Body() body: { code: string; amount: number; offerId?: string },
  ) {
    return this.transactionsService.validatePromoCode(
      req.user.userId,
      body.code,
      body.amount,
      body.offerId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('redeem')
  async redeemGift(
    @Request() req: { user: { userId: string } },
    @Body() body: { code: string },
  ) {
    return this.transactionsService.redeemGift(body.code, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('subscriptions')
  async mySubscriptions(@Request() req: { user: { userId: string } }) {
    return this.transactionsService.findSubscriptions(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async myTransactions(
    @Request() req: { user: { userId: string } },
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.transactionsService.findByBuyer(
      req.user.userId,
      skip ? Number(skip) : 0,
      take ? Number(take) : 20,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.transactionsService.findOne(id, req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/confirm')
  async confirmDelivery(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.transactionsService.confirmDelivery(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() body: { status: TransactionStatus },
  ) {
    return this.transactionsService.updateStatus(
      id,
      body.status,
      req.user.userId,
    );
  }
}
