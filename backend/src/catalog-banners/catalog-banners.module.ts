import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogBannersController } from './catalog-banners.controller';
import { CatalogBannersService } from './catalog-banners.service';

@Module({ imports: [PrismaModule], controllers: [CatalogBannersController], providers: [CatalogBannersService] })
export class CatalogBannersModule {}
