import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

interface TgWidgetBody {
  id: string | number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  hash: string;
  [key: string]: string | number | undefined;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  async login(@Body() body: Record<string, string>) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() body: Prisma.UserCreateInput) {
    return this.authService.register(body as Record<string, unknown>);
  }

  // ======= TELEGRAM PHONE LOGIN =======

  @Get('telegram-init')
  telegramInit(@Req() req: Request) {
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = this.jwtService.verify<{ sub: string }>(token);
        userId = decoded.sub;
      } catch {
        // Invalid token - treat as guest
      }
    }
    return this.authService.createLoginToken(userId);
  }

  @Get('telegram-poll')
  telegramPoll(@Query('token') token: string) {
    if (!token) throw new UnauthorizedException('Missing token');
    return this.authService.pollLoginToken(token);
  }

  // ======= LEGACY TELEGRAM WIDGET =======

  @Post('telegram')
  async telegramAuth(@Body() telegramData: TgWidgetBody) {
    const isValid = this.authService.validateTelegramHash(telegramData);
    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid Telegram authentication payload',
      );
    }
    const user =
      await this.authService.validateOrCreateTelegramUser(telegramData);
    return this.authService.login(user);
  }

  @Post('telegram-miniapp')
  async telegramMiniAppAuth(@Body() body: { initData: string }) {
    if (!body.initData) {
      throw new UnauthorizedException('Missing initData');
    }
    const telegramData = this.authService.validateTelegramMiniAppHash(
      body.initData,
    );
    if (!telegramData) {
      throw new UnauthorizedException('Invalid Telegram WebApp signature');
    }
    const user =
      await this.authService.validateOrCreateTelegramUser(telegramData);
    return this.authService.login(user);
  }

  @Get('me')
  me() {
    return { message: 'Use JWT token to get user info' };
  }
}
