import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramLoginStore } from './telegram-login-store.service';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV !== 'test') {
    throw new Error('JWT_SECRET is required');
  }
  return secret || 'test-only-jwt-secret';
}

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '1d' },
    }),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TelegramLoginStore,
    JwtStrategy,
    AuthRateLimitGuard,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
