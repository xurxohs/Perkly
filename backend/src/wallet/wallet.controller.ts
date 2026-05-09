import {
  Controller,
  Get,
  Param,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyReply } from 'fastify';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('transactions/:id.pkpass')
  async transactionPass(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Res() res: FastifyReply,
  ) {
    const pass = await this.walletService.generateTransactionPass(
      id,
      req.user.userId,
    );

    res.header('Content-Type', 'application/vnd.apple.pkpass');
    res.header(
      'Content-Disposition',
      `attachment; filename="perkly-${id}.pkpass"`,
    );
    res.send(pass);
  }
}
