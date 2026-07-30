import { Controller, Get, Patch, Post, Body, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('device-token')
  async updateDeviceToken(
    @Req() req: { user: { userId: string } },
    @Body('token') token: string,
  ) {
    const userId = req.user.userId;
    return this.notificationsService.updateDeviceToken(userId, token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('preferences')
  getPreferences(@Req() req: { user: { userId: string } }) {
    return this.notificationsService.getPreferences(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('preferences')
  updatePreferences(
    @Req() req: { user: { userId: string } },
    @Body() body: { purchases?: boolean; messages?: boolean; nearby?: boolean },
  ) {
    return this.notificationsService.updatePreferences(req.user.userId, body);
  }
}
