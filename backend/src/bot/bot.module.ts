import { Module, forwardRef, Global } from '@nestjs/common';
import { BotService } from './bot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { OffersModule } from '../offers/offers.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    OffersModule,
    forwardRef(() => AuthModule),
    forwardRef(() => TransactionsModule),
  ],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
