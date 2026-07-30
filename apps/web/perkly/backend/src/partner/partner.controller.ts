import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { EntitlementsService } from '../entitlements/entitlements.service';

interface AuthRequest extends Request {
  user: { userId: string };
}

@UseGuards(AuthGuard('jwt'))
@Controller('partner')
export class PartnerController {
  constructor(private readonly entitlements: EntitlementsService) {}

  @Get('capabilities')
  capabilities(@Req() req: AuthRequest) {
    return this.entitlements.getPartnerCapabilities(req.user.userId);
  }
}
