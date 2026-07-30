import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';

import { PrismaModule } from '../prisma/prisma.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [PrismaModule, EntitlementsModule],
  controllers: [SellerController],
})
export class SellerModule {}
