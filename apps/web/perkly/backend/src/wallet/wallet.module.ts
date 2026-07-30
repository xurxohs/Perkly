import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
