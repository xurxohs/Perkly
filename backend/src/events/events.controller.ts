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
  Res,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { EventsService, VendorEventCreateData } from './events.service';
import { Event, Prisma } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from '@nestjs/passport';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { normalizePagination } from '../common/pagination';

interface AuthRequest extends FastifyRequest {
  user: { userId: string; role?: string; tier?: string };
}

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Req() req: AuthRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<Event> {
    await this.ensureTopkaPublisher(req.user.userId);
    return this.eventsService.createVendorEvent(
      req.user.userId,
      this.normalizeVendorEventBody(body),
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('vendor')
  async createVendorEvent(
    @Req() req: AuthRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<Event> {
    await this.ensureTopkaPublisher(req.user.userId);
    return this.eventsService.createVendorEvent(
      req.user.userId,
      this.normalizeVendorEventBody(body),
    );
  }

  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ): Promise<{ data: Event[]; total: number }> {
    const pagination = normalizePagination(skip, take, {
      defaultTake: 20,
      maxTake: 100,
    });
    const normalizedCategory = category?.trim() || undefined;
    const normalizedSearch = search?.trim() || undefined;

    return this.eventsService.findAll({
      ...pagination,
      where: {
        category: normalizedCategory,
        OR: normalizedSearch
          ? [
              { title: { contains: normalizedSearch } },
              { description: { contains: normalizedSearch } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('topka-media')
  async topkaMedia(
    @Query('url') url?: string,
    @Res() res?: FastifyReply,
  ): Promise<void> {
    if (!url || !res) {
      res?.status(400).send('Missing url');
      return;
    }

    try {
      const media = await this.eventsService.proxyTopkaMedia(url);
      res.header('Content-Type', media.contentType);
      if (media.cacheControl) {
        res.header('Cache-Control', media.cacheControl);
      }
      res.send(media.buffer);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load image';
      res.status(502).send(message);
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Event | null> {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEventDto: Prisma.EventUpdateInput,
  ): Promise<Event> {
    return this.eventsService.update({
      where: { id },
      data: updateEventDto,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<Event> {
    return this.eventsService.remove({ id });
  }

  @Post('seed')
  seed(@Query('organizerId') organizerId: string) {
    return this.eventsService.seedEvents(organizerId);
  }

  private async ensureTopkaPublisher(userId: string) {
    if (await this.entitlements.canPublishTopka(userId)) {
      return;
    }

    throw new ForbiddenException(
      'Topka publishing requires a Platinum subscription',
    );
  }

  private normalizeVendorEventBody(
    body: Record<string, unknown>,
  ): VendorEventCreateData {
    const title = this.requiredString(body, 'title');
    const description = this.requiredString(body, 'description');
    const category = this.optionalString(body, 'category') ?? 'Событие';
    const date = this.requiredDate(body, 'date');
    const startTime =
      this.optionalString(body, 'startTime') ?? this.timeFromDate(date);
    const location = this.requiredString(body, 'location');
    const address = this.optionalString(body, 'address') ?? location;
    const imageUrl =
      this.optionalString(body, 'imageUrl') ??
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30';

    const payload: VendorEventCreateData = {
      title,
      description,
      category,
      date,
      startTime,
      ageLimit: this.optionalString(body, 'ageLimit') ?? '0+',
      location,
      address,
      imageUrl,
    };

    const fullDescription = this.optionalString(body, 'fullDescription');
    if (fullDescription) payload.fullDescription = fullDescription;

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
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private requiredDate(body: Record<string, unknown>, field: string): Date {
    const value = this.requiredString(body, field);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date`);
    }
    return date;
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
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }

  private timeFromDate(date: Date): string {
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
