import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [PrismaModule, BotModule],
  providers: [NotificationsService],
})
export class NotificationsModule {}
