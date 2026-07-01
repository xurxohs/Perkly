import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PromocodesService } from './promocodes.service';
import type { PromocodeInput } from './promocodes.service';

interface AuthRequest extends Request {
  user: { userId: string; role?: string };
}

@Controller()
export class PromocodesController {
  constructor(private readonly promocodesService: PromocodesService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Get('promocodes/company/me')
  listForMyCompany(@Req() req: AuthRequest) {
    return this.promocodesService.listForMyCompany(
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Get('promocodes/company/me/analytics')
  getCompanyAnalytics(@Req() req: AuthRequest) {
    return this.promocodesService.getCompanyAnalytics(
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Post('promocodes')
  create(@Req() req: AuthRequest, @Body() body: PromocodeInput) {
    return this.promocodesService.create(req.user.userId, req.user.role, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Patch('promocodes/:id')
  update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: PromocodeInput,
  ) {
    return this.promocodesService.update(
      req.user.userId,
      req.user.role,
      id,
      body,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Patch('promocodes/:id/status')
  updateStatus(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.promocodesService.updateStatus(
      req.user.userId,
      req.user.role,
      id,
      status,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('promocodes/:id/activate')
  activate(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.promocodesService.activate(req.user.userId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('promocodes/activations/:id/copy')
  copyActivation(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.promocodesService.copyActivation(req.user.userId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('promocodes/activations/:id/use')
  useActivation(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.promocodesService.useActivation(req.user.userId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users/me/promocode-activations')
  listMyActivations(@Req() req: AuthRequest) {
    return this.promocodesService.listMyActivations(req.user.userId);
  }
}
