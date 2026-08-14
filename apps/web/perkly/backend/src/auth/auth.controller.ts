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
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthGuard } from '@nestjs/passport';
import { IssuedSession, SessionService } from './session.service';
import { TelegramIdentityService } from './telegram-identity.service';

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
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly telegramIdentity: TelegramIdentityService,
  ) {}

  @Post('login')
  async login(
    @Body() body: Record<string, string>,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const result = await this.authService.login(user, this.sessionService.device(req));
    return this.sessionService.present(req, reply, result);
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
  async appleAuth(
    @Body()
    body: {
      identityToken?: string;
      nonce?: string;
      displayName?: string;
    },
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.loginWithApple(
      body.identityToken ?? '',
      body.nonce ?? '',
      body.displayName,
      this.sessionService.device(req),
    );
    return this.sessionService.present(req, reply, result);
  }

  // ======= TELEGRAM PHONE LOGIN =======

  @Get('telegram-init')
  telegramInit(@Req() req: FastifyRequest) {
    return this.authService.createLoginToken(
      'login',
      undefined,
      this.sessionService.device(req),
    );
  }

  @Get('telegram-poll')
  async telegramPoll(
    @Query('token') token: string,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    if (!token) throw new UnauthorizedException('Missing token');
    const result = await this.authService.pollLoginToken(token);
    if ('access_token' in result && typeof result.access_token === 'string') {
      if (this.sessionService.isBrowser(req)) {
        const presented = this.sessionService.present(req, reply, result as IssuedSession);
        return { status: 'ok', ...presented };
      }
    }
    return result;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('telegram-link/init')
  telegramLinkInit(
    @Req() req: FastifyRequest & { user: { userId: string } },
  ) {
    return this.authService.createLoginToken(
      'link',
      req.user.userId,
      this.sessionService.device(req),
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
  async telegramAuth(
    @Body() telegramData: TgWidgetBody,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const isValid = this.telegramIdentity.validateWidget(telegramData);
    const isFreshUse =
      isValid &&
      (await this.telegramIdentity.consume(telegramData.hash));
    if (!isFreshUse) {
      throw new UnauthorizedException(
        'Invalid Telegram authentication payload',
      );
    }
    const user =
      await this.telegramIdentity.resolveUser(telegramData);
    const result = await this.authService.login(user, this.sessionService.device(req));
    return this.sessionService.present(req, reply, result);
  }

  @Post('telegram-miniapp')
  async telegramMiniAppAuth(
    @Body() body: { initData: string },
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    if (!body.initData) {
      throw new UnauthorizedException('Missing initData');
    }
    const telegramData = this.telegramIdentity.validateMiniApp(
      body.initData,
    );
    const assertionHash = new URLSearchParams(body.initData).get('hash') ?? '';
    const isFreshUse =
      telegramData &&
      (await this.telegramIdentity.consume(assertionHash));
    if (!isFreshUse) {
      throw new UnauthorizedException('Invalid Telegram WebApp signature');
    }
    const user =
      await this.telegramIdentity.resolveUser(telegramData);
    const result = await this.authService.login(user, this.sessionService.device(req));
    return this.sessionService.present(req, reply, result);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(
    @Req() req: FastifyRequest & { user: { userId: string; sessionId?: string } },
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.sessionService.revokeCurrent(
      req.user.userId,
      req.user.sessionId,
    );
    this.sessionService.clearBrowserCookie(reply);
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  sessions(@Req() req: FastifyRequest & { user: { userId: string; sessionId?: string } }) {
    return this.sessionService.list(req.user.userId, req.user.sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/others')
  revokeOtherSessions(@Req() req: FastifyRequest & { user: { userId: string; sessionId?: string } }) {
    return this.sessionService.revokeOthers(req.user.userId, req.user.sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/current')
  revokeCurrentSession(
    @Req() req: FastifyRequest & { user: { userId: string; sessionId?: string } },
  ) {
    return this.sessionService.revokeCurrent(
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
    return this.sessionService.revoke(req.user.userId, id);
  }

  @Get('me')
  me() {
    return { message: 'Use JWT token to get user info' };
  }

}
