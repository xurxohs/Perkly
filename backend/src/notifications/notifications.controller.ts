import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
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
}
