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
    @Body() body: { offerId: string; isGift?: boolean },
  ) {
    return this.transactionsService.purchase(
      req.user.userId,
      body.offerId,
      body.isGift,
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
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
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
    @Body() body: { status: TransactionStatus },
  ) {
    return this.transactionsService.updateStatus(id, body.status);
  }
}
