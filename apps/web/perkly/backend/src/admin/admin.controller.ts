import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN') // Requires the 'ADMIN' role for all routes in this controller
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  // Users
  @Get('users')
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search: string = '',
  ) {
    return this.adminService.getAllUsers(Number(page), Number(limit), search);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: { user: { userId: string; role?: string } },
  ) {
    return this.adminService.updateUser(id, data, req.user.userId);
  }

  // Offers
  @Get('offers')
  async getOffers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
  ) {
    return this.adminService.getAllOffers(
      Number(page),
      Number(limit),
      search,
      status,
    );
  }

  @Patch('offers/:id')
  async updateOffer(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: { user: { userId: string; role?: string } },
  ) {
    return this.adminService.updateOffer(id, data, req.user.userId);
  }

  @Patch('offers/:id/moderation')
  async moderateOffer(
    @Param('id') id: string,
    @Body() data: { status?: unknown; note?: unknown },
    @Req() req: { user: { userId: string; role?: string } },
  ) {
    return this.adminService.moderateOffer(id, data, req.user.userId);
  }

  @Delete('offers/:id')
  async deleteOffer(
    @Param('id') id: string,
    @Req() req: { user: { userId: string; role?: string } },
  ) {
    return this.adminService.deleteOffer(id, req.user.userId);
  }

  // Events
  @Get('events')
  async getEvents(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
  ) {
    return this.adminService.getAllEvents(
      Number(page),
      Number(limit),
      search,
      status,
    );
  }

  @Patch('events/:id/moderation')
  async moderateEvent(
    @Param('id') id: string,
    @Body() data: { status?: unknown; note?: unknown },
    @Req() req: { user: { userId: string; role?: string } },
  ) {
    return this.adminService.moderateEvent(id, data, req.user.userId);
  }

  // Transactions
  @Get('transactions')
  async getTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status: string = '',
    @Query('search') search: string = '',
  ) {
    return this.adminService.getAllTransactions(
      Number(page),
      Number(limit),
      status,
      search,
    );
  }

  @Patch('transactions/:id/refund')
  async refundTransaction(
    @Param('id') id: string,
    @Req() req: { user: { userId: string; role?: string } },
  ) {
    return this.adminService.refundTransaction(id, req.user.userId);
  }

  // Disputes
  @Get('disputes')
  async getDisputes(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status: string = '',
  ) {
    return this.adminService.getAllDisputes(
      Number(page),
      Number(limit),
      status,
    );
  }

  @Patch('disputes/:id/resolve')
  async resolveDispute(
    @Param('id') id: string,
    @Body('resolution') resolution: 'BUYER' | 'SELLER',
    @Body('adminNote') adminNote: string | undefined,
    @Req() req: { user: { userId: string; role?: string } },
  ) {
    return this.adminService.resolveDispute(
      id,
      resolution,
      req.user.userId,
      adminNote,
    );
  }

  @Get('logs')
  async getLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('action') action: string = '',
  ) {
    return this.adminService.getAdminLogs(Number(page), Number(limit), action);
  }
}
