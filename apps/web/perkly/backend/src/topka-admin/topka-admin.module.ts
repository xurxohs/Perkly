import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TopkaAdminController } from './topka-admin.controller';
import { TopkaAdminService } from './topka-admin.service';

@Module({
  imports: [PrismaModule],
  controllers: [TopkaAdminController],
  providers: [TopkaAdminService],
})
export class TopkaAdminModule {}
