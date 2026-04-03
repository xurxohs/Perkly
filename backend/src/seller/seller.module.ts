import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SellerController],
})
export class SellerModule {}
