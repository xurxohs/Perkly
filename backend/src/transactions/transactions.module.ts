import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BotModule } from '../bot/bot.module';
import { SquadsModule } from '../squads/squads.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [PrismaModule, BotModule, forwardRef(() => SquadsModule)],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
