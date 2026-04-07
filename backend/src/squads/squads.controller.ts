import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SquadsService } from './squads.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

interface AuthRequest extends Request {
  user: { userId: string };
}

@Controller('squads')
@UseGuards(AuthGuard('jwt'))
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) {}

  @Post()
  async createSquad(
    @Req() req: AuthRequest,
    @Body() body: { name: string },
  ) {
    return this.squadsService.createSquad(req.user.userId, body.name);
  }

  @Post('join')
  async joinSquad(
    @Req() req: AuthRequest,
    @Body() body: { inviteCode: string },
  ) {
    return this.squadsService.joinSquad(req.user.userId, body.inviteCode);
  }

  @Get('me')
  async getSquadProgress(@Req() req: AuthRequest) {
    return this.squadsService.getSquadProgress(req.user.userId);
  }
}
