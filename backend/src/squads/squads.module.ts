import { Module, forwardRef } from '@nestjs/common';
import { SquadsService } from './squads.service';
import { SquadsController } from './squads.controller';
import { PrismaService } from '../prisma/prisma.service';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [forwardRef(() => BotModule)],
  controllers: [SquadsController],
  providers: [SquadsService, PrismaService],
  exports: [SquadsService],
})
export class SquadsModule {}
