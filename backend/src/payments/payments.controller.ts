import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
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

  @Post('webhook/click')
  @HttpCode(HttpStatus.OK)
  async clickWebhook(@Body() body: any) {
    try {
      return await this.paymentsService.processClickWebhook(body);
    } catch (error: any) {
      // Click expects { error: <code_number>, error_note: "..." }
      return {
        error: error.error || -8,
        error_note: error.message || 'Unknown error',
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('webhook/mock')
  async mockWebhook(
    @Req() req: { user: { userId: string } },
    @Body() body: { depositId: string; success?: boolean },
  ) {
    return this.paymentsService.mockCompleteTopUp(
      req.user.userId,
      body.depositId,
      body.success !== false,
    );
  }
}
