import { Module } from '@nestjs/common';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PartnerController } from './partner.controller';

@Module({
  imports: [EntitlementsModule],
  controllers: [PartnerController],
})
export class PartnerModule {}
