import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/roles.guard';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';

@Module({
  imports: [PrismaModule],
  controllers: [SafetyController],
  providers: [SafetyService, RolesGuard],
})
export class SafetyModule {}
