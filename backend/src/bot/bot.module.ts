import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
