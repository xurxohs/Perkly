import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('topup')
  async createTopUp(
    @Req() req: { user: { userId: string } },
    @Body('amount') amount: number,
  ) {
    const userId = req.user.userId;
    return this.paymentsService.createTopUp(userId, amount);
  }

  @Post('webhook/mock')
  async mockWebhook(
    @Body('depositId') depositId: string,
    @Body('success') success: boolean,
  ) {
    return this.paymentsService.processMockWebhook(depositId, success);
  }
}
