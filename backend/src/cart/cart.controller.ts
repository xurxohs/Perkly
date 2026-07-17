import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { CartService } from './cart.service';

interface AuthRequest extends Request { user: { userId: string } }

@Controller('cart')
@UseGuards(AuthGuard('jwt'))
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  list(@Req() req: AuthRequest) { return this.cart.list(req.user.userId); }

  @Put('items/:offerId')
  upsert(@Req() req: AuthRequest, @Param('offerId') offerId: string, @Body() body: { isGift?: boolean }) {
    return this.cart.upsert(req.user.userId, offerId, body.isGift === true);
  }

  @Delete('items/:offerId')
  remove(@Req() req: AuthRequest, @Param('offerId') offerId: string) {
    return this.cart.remove(req.user.userId, offerId);
  }

  @Delete()
  clear(@Req() req: AuthRequest) { return this.cart.clear(req.user.userId); }
}
