// Общий клиент PostgreSQL через Prisma.
// NestJS создаёт сервис один раз и подключается к базе при инициализации модуля.
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
