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
    @Req() req: any,
  ) {
    return this.adminService.updateUser(id, data, req.user.userId);
  }

  // Offers
  @Get('offers')
  async getOffers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getAllOffers(Number(page), Number(limit));
  }

  @Patch('offers/:id')
  async updateOffer(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.adminService.updateOffer(id, data, req.user.userId);
  }

  @Delete('offers/:id')
  async deleteOffer(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deleteOffer(id, req.user.userId);
  }

  // Transactions
  @Get('transactions')
  async getTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getAllTransactions(Number(page), Number(limit));
  }

  @Patch('transactions/:id/refund')
  async refundTransaction(@Param('id') id: string, @Req() req: any) {
    return this.adminService.refundTransaction(id, req.user.userId);
  }

  // Disputes
  @Get('disputes')
  async getDisputes(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getAllDisputes(Number(page), Number(limit));
  }

  @Patch('disputes/:id/resolve')
  async resolveDispute(
    @Param('id') id: string,
    @Body('resolution') resolution: 'BUYER' | 'SELLER',
    @Req() req: any,
  ) {
    return this.adminService.resolveDispute(id, resolution, req.user.userId);
  }
}
