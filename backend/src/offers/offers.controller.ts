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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PublicOffer, VendorOffer } from './offer.selects';
import { normalizePagination, parseFiniteNumber } from '../common/pagination';

interface AuthRequest extends Request {
  user: { userId: string; role?: string };
}

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Get('vendor/me')
  getVendorOffers(@Req() req: AuthRequest): Promise<VendorOffer[]> {
    return this.offersService.getVendorOffers(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Post('vendor')
  createVendorOffer(
    @Req() req: AuthRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<Offer> {
    return this.offersService.createVendorOffer(
      req.user.userId,
      this.normalizeVendorOfferBody(body),
      req.user.role,
    );
  }

  // ======= FEATURED PLACEMENT =======

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Post(':id/feature')
  featureOffer(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() body: { days: number },
  ): Promise<Offer> {
    return this.offersService.featureOffer(id, req.user.userId, body.days ?? 1);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
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
  ): Promise<{ data: PublicOffer[]; total: number }> {
    const pagination = normalizePagination(skip, take, {
      defaultTake: 20,
      maxTake: 100,
    });
    const geo = this.normalizeGeoQuery(lat, lng, radiusKm);

    return this.offersService.findAllFiltered({
      ...pagination,
      category,
      search,
      sort,
      isFlashDrop:
        isFlashDrop === 'true'
          ? true
          : isFlashDrop === 'false'
            ? false
            : undefined,
      minPrice: this.normalizePriceQuery(minPrice),
      maxPrice: this.normalizePriceQuery(maxPrice),
      ...geo,
    });
  }

  @Get(':id/related')
  findRelated(
    @Param('id') id: string,
    @Query('take') take?: string,
  ): Promise<{ data: PublicOffer[]; total: number }> {
    const normalizedTake = parseFiniteNumber(take);
    return this.offersService.findRelatedOffers(id, normalizedTake);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/save')
  saveOffer(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.offersService.saveOffer(req.user.userId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/save')
  unsaveOffer(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.offersService.unsaveOffer(req.user.userId, id);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PublicOffer | null> {
    return this.offersService.findOne({ id });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOfferDto: Prisma.OfferUpdateInput,
  ): Promise<Offer> {
    return this.offersService.update({ where: { id }, data: updateOfferDto });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
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

  private requiredString(body: Record<string, unknown>, field: string): string {
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

  private normalizePriceQuery(value?: string): number | undefined {
    return parseFiniteNumber(value);
  }

  private normalizeGeoQuery(
    lat?: string,
    lng?: string,
    radiusKm?: string,
  ): { lat?: number; lng?: number; radiusKm?: number } {
    const parsedLat = parseFiniteNumber(lat);
    const parsedLng = parseFiniteNumber(lng);
    const parsedRadius = parseFiniteNumber(radiusKm);

    if (
      parsedLat === undefined ||
      parsedLng === undefined ||
      parsedRadius === undefined ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      return {};
    }

    return {
      lat: parsedLat,
      lng: parsedLng,
      radiusKm: Math.min(Math.max(parsedRadius, 0), 100),
    };
  }
}
