import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  async getRooms(@Req() req: any) {
    return this.chatService.getRooms(req.user.userId, req.user.role);
  }

  @Get('rooms/:id/messages')
  async getMessages(
    @Param('id') roomId: string,
    @Req() req: any,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
  ) {
    return this.chatService.getMessages(
      roomId,
      req.user.userId,
      Number(skip),
      Number(take),
    );
  }

  @Post('rooms')
  async createDirectRoom(
    @Body() body: { targetUserId: string },
    @Req() req: any,
  ) {
    return this.chatService.createOrGetDirectRoom(
      req.user.userId,
      body.targetUserId,
    );
  }

  @Post('messages')
  async sendMessage(
    @Body() body: { roomId: string; content: string },
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(
      body.roomId,
      req.user.userId,
      body.content,
    );
  }

  @Patch('messages/read')
  async markAsRead(@Body() body: { roomId: string }, @Req() req: any) {
    return this.chatService.markAsRead(body.roomId, req.user.userId);
  }
}
