import {
  BadRequestException,
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
    @Body() body: Record<string, unknown>,
  ): Promise<Offer> {
    return this.offersService.createVendorOffer(
      req.user.userId,
      this.normalizeVendorOfferBody(body),
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

  private normalizeVendorOfferBody(
    body: Record<string, unknown>,
  ): Omit<Prisma.OfferCreateInput, 'seller'> {
    const title = this.requiredString(body, 'title');
    const description = this.requiredString(body, 'description');
    const category = this.requiredString(body, 'category');
    const hiddenData = this.requiredString(body, 'hiddenData');
    const price = this.requiredNumber(body, 'price');

    const payload: Omit<Prisma.OfferCreateInput, 'seller'> = {
      title,
      description,
      category,
      hiddenData,
      price,
      isActive: this.optionalBoolean(body, 'isActive') ?? true,
    };

    const vendorLogo =
      this.optionalString(body, 'vendorLogo') ??
      this.optionalString(body, 'imageUrl');
    if (vendorLogo) payload.vendorLogo = vendorLogo;

    const usageInstructions = this.optionalString(body, 'usageInstructions');
    if (usageInstructions) payload.usageInstructions = usageInstructions;

    const discountPercent = this.optionalInteger(body, 'discountPercent');
    if (discountPercent !== undefined) {
      payload.discountPercent = discountPercent;
    }

    const periodDays = this.optionalInteger(body, 'periodDays');
    if (periodDays !== undefined) payload.periodDays = periodDays;

    const isExclusive = this.optionalBoolean(body, 'isExclusive');
    if (isExclusive !== undefined) payload.isExclusive = isExclusive;

    const isFlashDrop = this.optionalBoolean(body, 'isFlashDrop');
    if (isFlashDrop !== undefined) payload.isFlashDrop = isFlashDrop;

    const expiresAt = this.optionalDate(body, 'expiresAt');
    if (expiresAt) payload.expiresAt = expiresAt;

    const latitude = this.optionalNumber(body, 'latitude');
    if (latitude !== undefined) payload.latitude = latitude;

    const longitude = this.optionalNumber(body, 'longitude');
    if (longitude !== undefined) payload.longitude = longitude;

    return payload;
  }

  private requiredString(
    body: Record<string, unknown>,
    field: string,
  ): string {
    const value = this.optionalString(body, field);
    if (!value) {
      throw new BadRequestException(`${field} is required`);
    }
    return value;
  }

  private optionalString(
    body: Record<string, unknown>,
    field: string,
  ): string | undefined {
    const value = body[field];
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  private requiredNumber(body: Record<string, unknown>, field: string): number {
    const value = this.optionalNumber(body, field);
    if (value === undefined) {
      throw new BadRequestException(`${field} must be a number`);
    }
    return value;
  }

  private optionalNumber(
    body: Record<string, unknown>,
    field: string,
  ): number | undefined {
    const value = body[field];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private optionalInteger(
    body: Record<string, unknown>,
    field: string,
  ): number | undefined {
    const value = this.optionalNumber(body, field);
    if (value === undefined) return undefined;
    if (!Number.isInteger(value)) {
      throw new BadRequestException(`${field} must be an integer`);
    }
    return value;
  }

  private optionalBoolean(
    body: Record<string, unknown>,
    field: string,
  ): boolean | undefined {
    const value = body[field];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value === 'true') return true;
      if (value === 'false') return false;
    }
    return undefined;
  }

  private optionalDate(
    body: Record<string, unknown>,
    field: string,
  ): Date | undefined {
    const value = body[field];
    if (typeof value !== 'string' || !value.trim()) return undefined;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date`);
    }

    return parsed;
  }
}
