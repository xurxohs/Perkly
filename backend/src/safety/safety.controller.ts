import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SafetyService } from './safety.service';

type AuthRequest = { user: { userId: string } };

@Controller('safety')
@UseGuards(AuthGuard('jwt'))
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Post('reports')
  createReport(@Req() req: AuthRequest, @Body() body: Parameters<SafetyService['createReport']>[1]) {
    return this.safety.createReport(req.user.userId, body);
  }

  @Get('reports/me')
  myReports(@Req() req: AuthRequest) { return this.safety.listMyReports(req.user.userId); }

  @Post('appeals')
  createAppeal(@Req() req: AuthRequest, @Body() body: Parameters<SafetyService['createAppeal']>[1]) {
    return this.safety.createAppeal(req.user.userId, body);
  }

  @Get('appeals/me')
  myAppeals(@Req() req: AuthRequest) { return this.safety.listMyAppeals(req.user.userId); }

  @Get('admin/reports')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  reports(@Query('status') status?: string) { return this.safety.listReports(status); }

  @Get('admin/appeals')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  appeals(@Query('status') status?: string) { return this.safety.listAppeals(status); }

  @Patch('admin/reports/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  resolveReport(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: { status?: string; resolution?: string }) {
    return this.safety.resolveReport(req.user.userId, id, body.status, body.resolution);
  }

  @Patch('admin/appeals/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  resolveAppeal(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: { status?: string; resolution?: string }) {
    return this.safety.resolveAppeal(req.user.userId, id, body.status, body.resolution);
  }
}
