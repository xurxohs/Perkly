import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

interface AuthRequest extends Request {
  user: { userId: string };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req: AuthRequest) {
    return this.usersService.findById(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  async updateMe(
    @Req() req: AuthRequest,
    @Body() body: { displayName?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/stats')
  async getMyStats(@Req() req: AuthRequest) {
    return this.usersService.getStats(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/saved-offers')
  async getMySavedOffers(@Req() req: AuthRequest) {
    return this.usersService.listSavedOffers(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/profile')
  async getMyB2CProfile(@Req() req: AuthRequest) {
    return this.usersService.getB2CProfile(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/profile')
  async updateMyB2CProfile(
    @Req() req: AuthRequest,
    @Body()
    body: {
      birthDate?: string | null;
      birthYear?: number | null;
      gender?: string | null;
      city?: string | null;
      anonymousId?: string | null;
    },
  ) {
    return this.usersService.updateB2CProfile(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/interests')
  async getMyInterests(@Req() req: AuthRequest) {
    return this.usersService.listInterests(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/interests')
  async replaceMyInterestsPost(
    @Req() req: AuthRequest,
    @Body() body: { interests?: string[] },
  ) {
    return this.usersService.replaceInterests(
      req.user.userId,
      body.interests ?? [],
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/interests')
  async replaceMyInterestsPatch(
    @Req() req: AuthRequest,
    @Body() body: { interests?: string[] },
  ) {
    return this.usersService.replaceInterests(
      req.user.userId,
      body.interests ?? [],
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('me/interests')
  async replaceMyInterestsPut(
    @Req() req: AuthRequest,
    @Body() body: { interests?: string[] },
  ) {
    return this.usersService.replaceInterests(
      req.user.userId,
      body.interests ?? [],
    );
  }

  // ======= PREMIUM SUBSCRIPTION =======

  @UseGuards(AuthGuard('jwt'))
  @Post('me/subscribe')
  async subscribe(
    @Req() req: AuthRequest,
    @Body() body: { tier: 'GOLD' | 'PLATINUM'; months: number },
  ) {
    return this.usersService.subscribe(
      req.user.userId,
      body.tier,
      body.months ?? 1,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/rewards/claim')
  async claimWheelReward(
    @Req() req: AuthRequest,
    @Body() body: { reward?: string },
  ) {
    return this.usersService.claimWheelReward(req.user.userId, body.reward);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/wheel/status')
  async getWheelStatus(@Req() req: AuthRequest) {
    return this.usersService.getWheelStatus(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/wheel/spin')
  async spinWheel(@Req() req: AuthRequest) {
    return this.usersService.spinWheel(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/daily-bonus/status')
  async getDailyBonusStatus(@Req() req: AuthRequest) {
    return this.usersService.getDailyBonusStatus(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/daily-bonus/claim')
  async claimDailyBonus(@Req() req: AuthRequest) {
    return this.usersService.claimDailyBonus(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/missions')
  async getDailyMissions(@Req() req: AuthRequest) {
    return this.usersService.getDailyMissions(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/missions/:missionId/claim')
  async claimDailyMission(
    @Req() req: AuthRequest,
    @Param('missionId') missionId: string,
  ) {
    return this.usersService.claimDailyMission(req.user.userId, missionId);
  }
}
