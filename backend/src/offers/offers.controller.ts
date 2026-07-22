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
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { OffersService } from './offers.service';
import { Prisma, Offer } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PublicOffer, VendorOffer } from './offer.selects';
import { normalizePagination, parseFiniteNumber } from '../common/pagination';
import { assertAcceptableUserContent } from '../common/content-moderation';
import {
  isValidOfferPriceUzs,
  MAX_OFFER_PRICE_UZS,
  MIN_PAID_OFFER_PRICE_UZS,
} from '../common/money';

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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Post('vendor/upload')
  async uploadVendorLogo(
    @Req() req: AuthRequest,
    @Body() body: { dataUrl: string },
  ): Promise<{ url: string }> {
    if (!body.dataUrl) {
      throw new BadRequestException('dataUrl is required');
    }
    return this.offersService.saveVendorLogo(body.dataUrl, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Get('vendor/draft')
  getVendorDraft(@Req() req: AuthRequest) {
    return this.offersService.getVendorDraft(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Patch('vendor/draft')
  saveVendorDraft(
    @Req() req: AuthRequest,
    @Body() body: { payload?: unknown },
  ) {
    if (!body.payload || typeof body.payload !== 'object')
      throw new BadRequestException('payload is required');
    return this.offersService.saveVendorDraft(
      req.user.userId,
      body.payload as Prisma.InputJsonValue,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @Delete('vendor/draft')
  deleteVendorDraft(@Req() req: AuthRequest) {
    return this.offersService.deleteVendorDraft(req.user.userId);
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
  create(
    @Body() createOfferDto: Prisma.OfferCreateInput,
    @Req() req: AuthRequest,
  ): Promise<Offer> {
    return this.offersService.create(createOfferDto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('category') category?: string,
    @Query('fulfillmentType') fulfillmentType?: string,
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
      fulfillmentType: fulfillmentType
        ? this.normalizeFulfillmentType(fulfillmentType)
        : undefined,
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
  @Get('recommendations/me')
  recommendations(
    @Req() req: AuthRequest,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('limit') limit?: string,
    @Query('exclude') exclude?: string,
  ) {
    return this.offersService.recommendationsForUser(req.user.userId, {
      lat: parseFiniteNumber(lat),
      lng: parseFiniteNumber(lng),
      limit: parseFiniteNumber(limit),
      exclude: new Set((exclude ?? '').split(',').filter(Boolean)),
    });
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
  @Roles('ADMIN', 'VENDOR')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<Offer> {
    if (req.user.role === 'VENDOR') {
      const offer = await this.offersService.findRaw(id);
      if (!offer) throw new NotFoundException('Offer not found');
      if (offer.sellerId !== req.user.userId) {
        throw new ForbiddenException('You can only update your own offers');
      }
    }
    const update = {
      where: { id },
      data: this.normalizeVendorOfferUpdateBody(body),
    };
    return req.user.role === 'VENDOR'
      ? this.offersService.updateVendorOffer(update)
      : this.offersService.update(update);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<Offer> {
    if (req.user.role === 'VENDOR') {
      const offer = await this.offersService.findRaw(id);
      if (!offer) throw new NotFoundException('Offer not found');
      if (offer.sellerId !== req.user.userId) {
        throw new ForbiddenException('You can only delete your own offers');
      }
    }
    return this.offersService.remove({ id });
  }

  private normalizeVendorOfferBody(
    body: Record<string, unknown>,
  ): Omit<Prisma.OfferCreateInput, 'seller'> {
    const title = this.requiredString(body, 'title');
    const description = this.requiredString(body, 'description');
    const category = this.normalizeCategory(
      this.requiredString(body, 'category'),
    );
    const hiddenData = this.requiredString(body, 'hiddenData');
    const fulfillmentType = this.normalizeFulfillmentType(
      this.optionalString(body, 'fulfillmentType') ?? 'INSTRUCTIONS',
    );
    const price = this.requiredNumber(body, 'price');
    assertAcceptableUserContent(title, 'Offer title');
    assertAcceptableUserContent(description, 'Offer description');
    if (!isValidOfferPriceUzs(price)) {
      throw new BadRequestException(
        `price must be 0 for a free offer or a whole UZS amount between ${MIN_PAID_OFFER_PRICE_UZS.toLocaleString('en-US')} and ${MAX_OFFER_PRICE_UZS.toLocaleString('en-US')}`,
      );
    }

    const payload: Omit<Prisma.OfferCreateInput, 'seller'> = {
      title,
      description,
      category,
      hiddenData,
      fulfillmentType,
      price,
      isActive: this.optionalBoolean(body, 'isActive') ?? true,
    };

    const vendorLogo = this.optionalString(body, 'vendorLogo');
    if (vendorLogo) payload.vendorLogo = vendorLogo;

    const imageUrl = this.optionalString(body, 'imageUrl');
    if (imageUrl) payload.imageUrl = imageUrl;

    const images = this.normalizeImages(body.images);
    if (images) payload.images = images;
    else if (imageUrl) payload.images = [imageUrl];

    const thumbnailUrl =
      this.optionalString(body, 'thumbnailUrl') ??
      (imageUrl?.includes('/uploads/vendor/')
        ? imageUrl.replace(/\.webp$/, '-thumb.webp')
        : undefined);
    if (thumbnailUrl) payload.thumbnailUrl = thumbnailUrl;

    const usageInstructions = this.optionalString(body, 'usageInstructions');
    if (usageInstructions) payload.usageInstructions = usageInstructions;

    const discountPercent = this.optionalInteger(body, 'discountPercent');
    if (discountPercent !== undefined) {
      if (discountPercent < 0 || discountPercent > 100) {
        throw new BadRequestException(
          'discountPercent must be between 0 and 100',
        );
      }
      payload.discountPercent = discountPercent;
    }

    const periodDays = this.optionalInteger(body, 'periodDays');
    if (periodDays !== undefined) {
      if (periodDays < 0 || periodDays > 3650) {
        throw new BadRequestException('periodDays must be between 0 and 3650');
      }
      payload.periodDays = periodDays;
    }

    const deliveryEstimateMinutes = this.optionalInteger(
      body,
      'deliveryEstimateMinutes',
    );
    if (deliveryEstimateMinutes !== undefined) {
      if (deliveryEstimateMinutes < 0 || deliveryEstimateMinutes > 43200) {
        throw new BadRequestException(
          'deliveryEstimateMinutes must be between 0 and 43200',
        );
      }
      payload.deliveryEstimateMinutes = deliveryEstimateMinutes;
    }
    const warrantyDays = this.optionalInteger(body, 'warrantyDays');
    if (warrantyDays !== undefined) {
      if (warrantyDays < 0 || warrantyDays > 3650)
        throw new BadRequestException(
          'warrantyDays must be between 0 and 3650',
        );
      payload.warrantyDays = warrantyDays;
    }
    const stockQuantity = this.optionalInteger(body, 'stockQuantity');
    if (stockQuantity !== undefined) {
      if (stockQuantity < 0 || stockQuantity > 1000000)
        throw new BadRequestException(
          'stockQuantity must be between 0 and 1000000',
        );
      payload.stockQuantity = stockQuantity;
    }
    const buyerInputPrompt = this.optionalString(body, 'buyerInputPrompt');
    if (buyerInputPrompt !== undefined)
      payload.buyerInputPrompt = buyerInputPrompt;
    const buyerInputRequired = this.optionalBoolean(body, 'buyerInputRequired');
    if (buyerInputRequired !== undefined)
      payload.buyerInputRequired = buyerInputRequired;

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

  private normalizeVendorOfferUpdateBody(
    body: Record<string, unknown>,
  ): Prisma.OfferUpdateInput {
    const payload: Prisma.OfferUpdateInput = {};
    const stringFields = [
      'title',
      'description',
      'category',
      'hiddenData',
      'vendorLogo',
      'imageUrl',
      'thumbnailUrl',
      'usageInstructions',
      'fulfillmentType',
      'buyerInputPrompt',
    ] as const;
    for (const field of stringFields) {
      const value = this.optionalString(body, field);
      if (value !== undefined) {
        if (field === 'title' || field === 'description') {
          assertAcceptableUserContent(value, `Offer ${field}`);
        }
        payload[field] =
          field === 'category'
            ? this.normalizeCategory(value)
            : field === 'fulfillmentType'
              ? this.normalizeFulfillmentType(value)
              : value;
      }
    }

    if (body.images !== undefined)
      payload.images = this.normalizeImages(body.images) ?? [];
    else if (typeof body.imageUrl === 'string' && body.imageUrl.trim())
      payload.images = [body.imageUrl.trim()];

    const price = this.optionalInteger(body, 'price');
    if (price !== undefined) {
      if (!isValidOfferPriceUzs(price)) {
        throw new BadRequestException(
          `price must be 0 for a free offer or a whole UZS amount between ${MIN_PAID_OFFER_PRICE_UZS.toLocaleString('en-US')} and ${MAX_OFFER_PRICE_UZS.toLocaleString('en-US')}`,
        );
      }
      payload.price = price;
    }
    const discountPercent = this.optionalInteger(body, 'discountPercent');
    if (discountPercent !== undefined) {
      if (discountPercent < 0 || discountPercent > 100) {
        throw new BadRequestException(
          'discountPercent must be between 0 and 100',
        );
      }
      payload.discountPercent = discountPercent;
    }
    const periodDays = this.optionalInteger(body, 'periodDays');
    if (periodDays !== undefined) {
      if (periodDays < 0 || periodDays > 3650) {
        throw new BadRequestException('periodDays must be between 0 and 3650');
      }
      payload.periodDays = periodDays;
    }
    for (const [field, max] of [
      ['deliveryEstimateMinutes', 43200],
      ['warrantyDays', 3650],
      ['stockQuantity', 1000000],
    ] as const) {
      const value = this.optionalInteger(body, field);
      if (value !== undefined) {
        if (value < 0 || value > max)
          throw new BadRequestException(
            `${field} must be between 0 and ${max}`,
          );
        payload[field] = value;
      }
    }
    for (const field of [
      'isActive',
      'isExclusive',
      'isFlashDrop',
      'buyerInputRequired',
    ] as const) {
      const value = this.optionalBoolean(body, field);
      if (value !== undefined) payload[field] = value;
    }
    const expiresAt = this.optionalDate(body, 'expiresAt');
    if (expiresAt !== undefined) payload.expiresAt = expiresAt;
    const latitude = this.optionalNumber(body, 'latitude');
    const longitude = this.optionalNumber(body, 'longitude');
    if (latitude !== undefined) {
      if (latitude < -90 || latitude > 90)
        throw new BadRequestException('Invalid latitude');
      payload.latitude = latitude;
    }
    if (longitude !== undefined) {
      if (longitude < -180 || longitude > 180)
        throw new BadRequestException('Invalid longitude');
      payload.longitude = longitude;
    }
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('No supported offer fields supplied');
    }
    return payload;
  }

  private normalizeImages(value: unknown): string[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value))
      throw new BadRequestException('images must be an array');
    const images = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.startsWith('https://') || item.startsWith('/'));
    if (images.length !== value.length)
      throw new BadRequestException('Некорректное изображение');
    if (images.length > 8)
      throw new BadRequestException('Можно добавить не больше 8 изображений');
    return [...new Set(images)];
  }

  private requiredString(body: Record<string, unknown>, field: string): string {
    const value = this.optionalString(body, field);
    if (!value) {
      throw new BadRequestException(`${field} is required`);
    }
    return value;
  }

  private normalizeCategory(value: string): string {
    const category = value.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_]{1,39}$/.test(category)) {
      throw new BadRequestException('Invalid category');
    }
    return category;
  }

  private normalizeFulfillmentType(value: string): string {
    const normalized = value.trim().toUpperCase();
    const supported = ['PROMOCODE', 'DIGITAL_CODE', 'LINK', 'INSTRUCTIONS'];
    if (!supported.includes(normalized)) {
      throw new BadRequestException(
        `fulfillmentType must be one of: ${supported.join(', ')}`,
      );
    }
    return normalized;
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
