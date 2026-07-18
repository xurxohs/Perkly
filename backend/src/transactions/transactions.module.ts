import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SquadsModule } from '../squads/squads.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => SquadsModule),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
