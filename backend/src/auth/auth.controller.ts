import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  Query,
  Req,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthGuard } from '@nestjs/passport';

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
@UseGuards(AuthRateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: Record<string, string>, @Req() req: FastifyRequest) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user, this.sessionDevice(req));
  }

  @Post('register')
  async register(
    @Body()
    body: {
      email?: string;
      password?: string;
      displayName?: string;
    },
  ) {
    return this.authService.register(body as Record<string, unknown>);
  }

  @Post('password/forgot')
  requestPasswordReset(@Body() body: { email?: string }) {
    return this.authService.requestPasswordReset(body.email ?? '');
  }

  @Post('password/reset')
  resetPassword(
    @Body() body: { email?: string; code?: string; newPassword?: string },
  ) {
    return this.authService.resetPassword(
      body.email ?? '',
      body.code ?? '',
      body.newPassword ?? '',
    );
  }

  @Post('apple')
  appleAuth(
    @Body()
    body: {
      identityToken?: string;
      nonce?: string;
      displayName?: string;
    },
    @Req() req: FastifyRequest,
  ) {
    return this.authService.loginWithApple(
      body.identityToken ?? '',
      body.nonce ?? '',
      body.displayName,
      this.sessionDevice(req),
    );
  }

  // ======= TELEGRAM PHONE LOGIN =======

  @Get('telegram-init')
  telegramInit(@Req() req: FastifyRequest) {
    return this.authService.createLoginToken(
      'login',
      undefined,
      this.sessionDevice(req),
    );
  }

  @Get('telegram-poll')
  telegramPoll(@Query('token') token: string) {
    if (!token) throw new UnauthorizedException('Missing token');
    return this.authService.pollLoginToken(token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('telegram-link/init')
  telegramLinkInit(
    @Req() req: FastifyRequest & { user: { userId: string } },
  ) {
    return this.authService.createLoginToken(
      'link',
      req.user.userId,
      this.sessionDevice(req),
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('telegram-link/poll')
  telegramLinkPoll(
    @Query('token') token: string,
    @Req() req: FastifyRequest & { user: { userId: string } },
  ) {
    if (!token) throw new UnauthorizedException('Missing token');
    return this.authService.pollLoginToken(token, req.user.userId);
  }

  // ======= LEGACY TELEGRAM WIDGET =======

  @Post('telegram')
  async telegramAuth(@Body() telegramData: TgWidgetBody, @Req() req: FastifyRequest) {
    const isValid = this.authService.validateTelegramHash(telegramData);
    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid Telegram authentication payload',
      );
    }
    const user =
      await this.authService.validateOrCreateTelegramUser(telegramData);
    return this.authService.login(user, this.sessionDevice(req));
  }

  @Post('telegram-miniapp')
  async telegramMiniAppAuth(@Body() body: { initData: string }, @Req() req: FastifyRequest) {
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
    return this.authService.login(user, this.sessionDevice(req));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  sessions(@Req() req: FastifyRequest & { user: { userId: string; sessionId?: string } }) {
    return this.authService.listSessions(req.user.userId, req.user.sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/others')
  revokeOtherSessions(@Req() req: FastifyRequest & { user: { userId: string; sessionId?: string } }) {
    return this.authService.revokeOtherSessions(req.user.userId, req.user.sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/current')
  revokeCurrentSession(
    @Req() req: FastifyRequest & { user: { userId: string; sessionId?: string } },
  ) {
    return this.authService.revokeCurrentSession(
      req.user.userId,
      req.user.sessionId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:id')
  revokeSession(
    @Req() req: FastifyRequest & { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.authService.revokeSession(req.user.userId, id);
  }

  @Get('me')
  me() {
    return { message: 'Use JWT token to get user info' };
  }

  private sessionDevice(req: FastifyRequest) {
    const header = (name: string) => {
      const value = req.headers[name];
      return Array.isArray(value) ? value[0] : value;
    };
    return {
      deviceId: header('x-device-id'),
      deviceName: header('x-device-name'),
      userAgent: header('user-agent'),
    };
  }
}
