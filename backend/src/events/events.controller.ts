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
import { assertAcceptableUserContent } from '../common/content-moderation';

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

  @UseGuards(AuthGuard('jwt'))
  @Post('media/upload')
  async uploadCover(
    @Req() req: AuthRequest,
    @Body() body: { dataUrl?: string },
  ): Promise<{ url: string }> {
    await this.ensureTopkaPublisher(req.user.userId);
    if (!body.dataUrl) throw new BadRequestException('dataUrl is required');
    return this.eventsService.saveEventCover(body.dataUrl);
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
        moderationStatus: 'APPROVED',
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

  @UseGuards(AuthGuard('jwt'))
  @Get('mine')
  mine(@Req() req: AuthRequest) {
    return this.eventsService.listMine(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('saved')
  saved(@Req() req: AuthRequest) {
    return this.eventsService.listSaved(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/save')
  save(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.eventsService.save(req.user.userId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/save')
  unsave(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.eventsService.unsave(req.user.userId, id);
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
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<Event> {
    await this.ensureEventOwnerOrAdmin(req.user, id);
    const data = this.normalizeVendorEventUpdateBody(body);
    if (req.user.role !== 'ADMIN') {
      data.moderationStatus = 'PENDING';
      data.moderationNote = null;
      data.moderationAt = null;
      data.moderationBy = null;
      data.publishedAt = null;
    }
    return this.eventsService.update({
      where: { id },
      data,
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ): Promise<Event> {
    await this.ensureEventOwnerOrAdmin(req.user, id);
    return this.eventsService.remove({ id });
  }

  private async ensureEventOwnerOrAdmin(
    user: AuthRequest['user'],
    eventId: string,
  ) {
    if (user.role === 'ADMIN') return;
    const event = await this.eventsService.findManagedOne(eventId);
    if (!event || event.organizerId !== user.userId) {
      throw new ForbiddenException('You cannot modify this event');
    }
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
    assertAcceptableUserContent(title, 'Event title');
    assertAcceptableUserContent(description, 'Event description');
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
    if (fullDescription) {
      assertAcceptableUserContent(fullDescription, 'Event fullDescription');
      payload.fullDescription = fullDescription;
    }

    const latitude = this.optionalNumber(body, 'latitude');
    if (latitude !== undefined) payload.latitude = latitude;

    const longitude = this.optionalNumber(body, 'longitude');
    if (longitude !== undefined) payload.longitude = longitude;

    return payload;
  }

  private normalizeVendorEventUpdateBody(
    body: Record<string, unknown>,
  ): Prisma.EventUpdateInput {
    const payload: Prisma.EventUpdateInput = {};
    for (const field of [
      'title',
      'description',
      'fullDescription',
      'category',
      'startTime',
      'ageLimit',
      'location',
      'address',
      'imageUrl',
    ] as const) {
      const value = this.optionalString(body, field);
      if (value !== undefined) {
        if (
          field === 'title' ||
          field === 'description' ||
          field === 'fullDescription'
        ) {
          assertAcceptableUserContent(value, `Event ${field}`);
        }
        payload[field] = value;
      }
    }
    if (body.date !== undefined) payload.date = this.requiredDate(body, 'date');
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
      throw new BadRequestException('No supported event fields supplied');
    }
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
