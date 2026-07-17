import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OffersModule } from './offers/offers.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { ReviewsModule } from './reviews/reviews.module';
import { DisputesModule } from './disputes/disputes.module';
import { AdminModule } from './admin/admin.module';
import { SellerModule } from './seller/seller.module';
import { BotModule } from './bot/bot.module';
import { TelegrafModule } from 'nestjs-telegraf';
import { ChatModule } from './chat/chat.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SquadsModule } from './squads/squads.module';
import { EventsModule } from './events/events.module';
import { PartnerModule } from './partner/partner.module';
import { WalletModule } from './wallet/wallet.module';
import { HomeModule } from './home/home.module';
import { TopkaAdminModule } from './topka-admin/topka-admin.module';
import { CompaniesModule } from './companies/companies.module';
import { PromocodesModule } from './promocodes/promocodes.module';
import { CartModule } from './cart/cart.module';
import { DiagnosticsModule } from './diagnostics/diagnostics.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { SafetyModule } from './safety/safety.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: (() => {
          const token = configService.get<string>('TELEGRAM_BOT_TOKEN');
          if (!token && process.env.NODE_ENV !== 'test') {
            throw new Error('TELEGRAM_BOT_TOKEN is required');
          }
          return token || 'test-only-telegram-token';
        })(),
        launchOptions:
          configService.get<string>('TELEGRAM_UPDATES_ENABLED') === 'false'
            ? false
            : undefined,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    OffersModule,
    PrismaModule,
    AuthModule,
    TransactionsModule,
    UsersModule,
    ReviewsModule,
    DisputesModule,
    AdminModule,
    SellerModule,
    BotModule,
    ChatModule,
    NotificationsModule,
    PaymentsModule,
    AnalyticsModule,
    SquadsModule,
    EventsModule,
    PartnerModule,
    WalletModule,
    HomeModule,
    TopkaAdminModule,
    CompaniesModule,
    PromocodesModule,
    CartModule,
    DiagnosticsModule,
    InfrastructureModule,
    SafetyModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
