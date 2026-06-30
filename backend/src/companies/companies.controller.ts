import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CompaniesService } from './companies.service';
import type { CompanyApplicationInput } from './companies.service';

interface AuthRequest extends Request {
  user: { userId: string; role?: string };
}

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMine(@Req() req: AuthRequest) {
    return this.companiesService.getMyCompany(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('apply')
  apply(@Req() req: AuthRequest, @Body() body: CompanyApplicationInput) {
    return this.companiesService.apply(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get()
  list(@Query('status') status?: string) {
    return this.companiesService.list(status);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.companiesService.updateStatus(id, status);
  }
}
