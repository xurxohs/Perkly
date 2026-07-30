// Административная часть Topka внутри общего Perkly Backend.
// Модуль управляет публикациями, но использует ту же базу, авторизацию и инфраструктуру продукта.
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
