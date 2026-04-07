import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { OffersService } from './offers.service';
import { Prisma, Offer } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

interface AuthRequest extends Request {
  user: { userId: string };
}

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('vendor/me')
  getVendorOffers(@Req() req: AuthRequest): Promise<Offer[]> {
    return this.offersService.getVendorOffers(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('vendor')
  createVendorOffer(
    @Req() req: AuthRequest,
    @Body() createOfferDto: Omit<Prisma.OfferCreateInput, 'seller'>,
  ): Promise<Offer> {
    return this.offersService.createVendorOffer(
      req.user.userId,
      createOfferDto,
    );
  }

  // ======= FEATURED PLACEMENT =======

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/feature')
  featureOffer(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() body: { days: number },
  ): Promise<Offer> {
    return this.offersService.featureOffer(id, req.user.userId, body.days ?? 1);
  }

  @Post()
  create(@Body() createOfferDto: Prisma.OfferCreateInput): Promise<Offer> {
    return this.offersService.create(createOfferDto);
  }

  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('isFlashDrop') isFlashDrop?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
  ): Promise<{ data: Offer[]; total: number }> {
    return this.offersService.findAllFiltered({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      category,
      search,
      sort,
      isFlashDrop:
        isFlashDrop === 'true'
          ? true
          : isFlashDrop === 'false'
            ? false
            : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Offer | null> {
    return this.offersService.findOne({ id });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOfferDto: Prisma.OfferUpdateInput,
  ): Promise<Offer> {
    return this.offersService.update({ where: { id }, data: updateOfferDto });
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<Offer> {
    return this.offersService.remove({ id });
  }
}
