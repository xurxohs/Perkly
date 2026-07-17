import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomInt } from 'crypto';
import { Event, Prisma, TopkaPost } from '@prisma/client';
import { TtlCache } from '../common/ttl-cache';
import {
  NormalizedPagination,
  normalizePagination,
} from '../common/pagination';
import { assertAcceptableUserContent } from '../common/content-moderation';

type EventMedia = {
  originalUrl?: string | null;
  poster3x4Url?: string | null;
  story9x16Url?: string | null;
  square1x1Url?: string | null;
  preview16x9Url?: string | null;
};

type EventFeedItem = Event & {
  postType?: string;
  subtitle?: string | null;
  tags?: string[];
  badges?: string[];
  endTime?: string | null;
  priceText?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  priority?: number;
  isFeatured?: boolean;
  media?: EventMedia;
};

export type VendorEventCreateData = {
  title: string;
  category: string;
  description: string;
  fullDescription?: string;
  date: Date;
  startTime: string;
  ageLimit: string;
  location: string;
  address: string;
  latitude?: number;
  longitude?: number;
  imageUrl: string;
};

type TopkaPublishedEvent = {
  id?: string;
  title?: string;
  description?: string;
  fullDescription?: string | null;
  date?: string;
  time?: string;
  venue?: string;
  place?: string;
  address?: string;
  image?: string;
  category?: string;
  sourceUrl?: string;
};

type TopkaPublishedResponse = {
  events?: TopkaPublishedEvent[];
  updated_at?: string;
};

type EventQueryFilters = {
  category?: string;
  search?: string;
};

type EventFeedSlice = {
  data: EventFeedItem[];
  total: number;
};

@Injectable()
export class EventsService {
  private readonly cache = new TtlCache();

  constructor(private prisma: PrismaService) {}

  listSaved(userId: string) {
    return this.prisma.savedEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, eventId: true, createdAt: true },
    });
  }

  async save(userId: string, eventId: string) {
    return this.prisma.savedEvent.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId },
      update: {},
      select: { id: true, eventId: true, createdAt: true },
    });
  }

  async unsave(userId: string, eventId: string) {
    const result = await this.prisma.savedEvent.deleteMany({
      where: { userId, eventId },
    });
    return { deleted: result.count > 0 };
  }

  async create(data: Prisma.EventCreateInput): Promise<Event> {
    this.assertEventContent(data);
    return await this.prisma.event.create({
      data,
    });
  }

  async createVendorEvent(
    organizerId: string,
    data: VendorEventCreateData,
  ): Promise<Event> {
    this.assertEventContent(data);
    return this.prisma.event.create({
      data: {
        ...data,
        organizer: { connect: { id: organizerId } },
      },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.EventWhereUniqueInput;
    where?: Prisma.EventWhereInput;
    orderBy?: Prisma.EventOrderByWithRelationInput;
  }): Promise<{ data: EventFeedItem[]; total: number }> {
    const pagination = normalizePagination(params.skip, params.take, {
      defaultTake: 20,
      maxTake: 100,
    });
    const { where } = params;
    const orderBy = params.orderBy ?? { createdAt: 'desc' };
    const filters = this.extractEventQueryFilters(where);
    const sourceWindow: NormalizedPagination = {
      skip: 0,
      take: pagination.skip + pagination.take,
    };
    const [dbEvents, dbTotal, parserTopkaEvents, adminTopkaPosts] =
      await Promise.all([
        this.prisma.event.findMany({
          where,
          orderBy,
          skip: sourceWindow.skip,
          take: sourceWindow.take,
        }),
        this.prisma.event.count({ where }),
        this.cache.getOrSet(
          this.buildEventCacheKey('topkaEvents', filters, sourceWindow),
          300_000,
          () => this.fetchTopkaEventSlice(filters, sourceWindow),
        ),
        this.cache.getOrSet(
          this.buildEventCacheKey('adminTopkaPosts', filters, sourceWindow),
          120_000,
          () => this.fetchAdminTopkaPosts(filters, sourceWindow),
        ),
      ]);

    const merged = this.mergeEvents(dbEvents, [
      ...adminTopkaPosts.data,
      ...parserTopkaEvents.data,
    ])
      .filter((event) => this.matchesWhere(event, where))
      .sort((left, right) => this.compareEventFeedItems(left, right));

    return {
      data: merged.slice(pagination.skip, pagination.skip + pagination.take),
      total: dbTotal + adminTopkaPosts.total + parserTopkaEvents.total,
    };
  }

  async findOne(id: string): Promise<EventFeedItem | null> {
    if (id.startsWith('topka-post-')) {
      const postId = id.replace(/^topka-post-/, '');
      const post = await this.prisma.topkaPost.findUnique({
        where: { id: postId },
      });
      return post ? this.mapAdminTopkaPost(post) : null;
    }

    if (id.startsWith('topka-')) {
      const topkaEvents = await this.fetchTopkaEvents();
      return topkaEvents.find((event) => event.id === id) ?? null;
    }

    return await this.prisma.event.findUnique({
      where: { id },
    });
  }

  async update(params: {
    where: Prisma.EventWhereUniqueInput;
    data: Prisma.EventUpdateInput;
  }): Promise<Event> {
    const { where, data } = params;
    this.assertEventContent(data);
    return await this.prisma.event.update({
      data,
      where,
    });
  }

  async remove(where: Prisma.EventWhereUniqueInput): Promise<Event> {
    return this.prisma.event.delete({
      where,
    });
  }

  private assertEventContent(
    data:
      | Prisma.EventCreateInput
      | Prisma.EventUpdateInput
      | VendorEventCreateData,
  ) {
    const title = this.stringUpdateValue(data.title);
    const description = this.stringUpdateValue(data.description);
    const fullDescription = this.stringUpdateValue(data.fullDescription);
    if (title !== undefined) {
      assertAcceptableUserContent(title, 'Event title');
    }
    if (description !== undefined) {
      assertAcceptableUserContent(description, 'Event description');
    }
    if (fullDescription !== undefined) {
      assertAcceptableUserContent(fullDescription, 'Event fullDescription');
    }
  }

  private stringUpdateValue(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (
      value &&
      typeof value === 'object' &&
      'set' in value &&
      typeof value.set === 'string'
    ) {
      return value.set;
    }
    return undefined;
  }

  async proxyTopkaMedia(url: string): Promise<{
    contentType: string;
    buffer: Buffer;
    cacheControl?: string | null;
  }> {
    const target = this.resolveParserMediaUrl(url);
    if (!this.isAllowedParserUrl(target)) {
      throw new Error('Unsupported media URL');
    }

    const response = await fetch(target);
    if (!response.ok) {
      throw new Error(`Media fetch failed with status ${response.status}`);
    }

    return {
      contentType:
        response.headers.get('content-type') || 'application/octet-stream',
      cacheControl: response.headers.get('cache-control'),
      buffer: Buffer.from(await response.arrayBuffer()),
    };
  }

  // Helper for mock data generation or seeding
  async seedEvents(organizerId: string) {
    const categories = [
      'Фестиваль',
      'Выставка',
      'Вечеринка',
      'Концерт',
      'Мастер-класс',
    ];
    const titles = [
      'Neon Summer Fest',
      'Art & Tech Exhibition',
      'Underground Techno Night',
      'Digital Marketing Summit',
      'Wine & Jazz Evening',
    ];

    for (let i = 0; i < titles.length; i++) {
      await this.prisma.event.create({
        data: {
          title: titles[i],
          category: categories[i % categories.length],
          description:
            'Присоединяйтесь к нам для незабываемого вечера, полного эмоций, новых знакомств и ярких впечатлений. Самое ожидаемое событие этого сезона!',
          fullDescription:
            'Это мероприятие объединяет лучших представителей индустрии. Тебя ждет эксклюзивная программа, живое общение и специальные гости. Будь в центре событий вместе с Perkly.',
          date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          startTime: '19:00',
          ageLimit: i % 2 === 0 ? '18+' : '12+',
          location: 'Tashkent Hall',
          address: 'улица Амира Темура, 107',
          imageUrl: `https://picsum.photos/seed/${i + 20}/800/1200`,
          viewersCount: randomInt(50, 250),
          participantsCount: randomInt(200, 1700),
          organizerId,
        },
      });
    }
  }

  private async fetchTopkaEvents(): Promise<EventFeedItem[]> {
    const parserUrl = this.getTopkaParserUrl();

    try {
      const response = await fetch(`${parserUrl}/topka/published`);
      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as TopkaPublishedResponse;
      const updatedAt =
        payload.updated_at && !Number.isNaN(Date.parse(payload.updated_at))
          ? new Date(payload.updated_at)
          : new Date();

      return (payload.events || [])
        .map((item, index) => this.mapTopkaEvent(item, updatedAt, index))
        .filter((item): item is EventFeedItem => item !== null);
    } catch {
      return [];
    }
  }

  private async fetchTopkaEventSlice(
    filters: EventQueryFilters,
    pagination: NormalizedPagination,
  ): Promise<EventFeedSlice> {
    const parserUrl = this.getTopkaParserUrl();

    try {
      const response = await fetch(`${parserUrl}/topka/published`);
      if (!response.ok) {
        return { data: [], total: 0 };
      }

      const payload = (await response.json()) as TopkaPublishedResponse;
      const updatedAt =
        payload.updated_at && !Number.isNaN(Date.parse(payload.updated_at))
          ? new Date(payload.updated_at)
          : new Date();
      const limit = pagination.skip + pagination.take;
      const data: EventFeedItem[] = [];
      let matched = 0;

      for (const [index, item] of (payload.events || []).entries()) {
        const event = this.mapTopkaEvent(item, updatedAt, index);
        if (!event || !this.matchesEventQueryFilters(event, filters)) {
          continue;
        }

        if (matched >= pagination.skip && data.length < pagination.take) {
          data.push(event);
        }
        matched += 1;
      }

      return { data, total: matched };
    } catch {
      return { data: [], total: 0 };
    }
  }

  private async fetchAdminTopkaPosts(
    filters: EventQueryFilters,
    pagination: NormalizedPagination,
  ): Promise<EventFeedSlice> {
    const now = new Date();
    const where = this.buildAdminTopkaPostWhere(filters, now);
    const [posts, total] = await Promise.all([
      this.prisma.topkaPost.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { publishAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.topkaPost.count({ where }),
    ]);

    return { data: posts.map((post) => this.mapAdminTopkaPost(post)), total };
  }

  private mapAdminTopkaPost(post: TopkaPost): EventFeedItem {
    const eventDate = post.date || post.publishAt || post.createdAt;
    const imageUrl =
      post.poster3x4Url ||
      post.originalUrl ||
      post.preview16x9Url ||
      'https://perkly.uz/demo-events/festival.png';

    return {
      id: `topka-post-${post.id}`,
      title: post.title,
      category: post.category,
      description: post.description || post.subtitle || post.title,
      fullDescription: post.fullDescription || post.description,
      date: eventDate,
      startTime: post.startTime || '00:00',
      ageLimit: '0+',
      location: post.location || 'Topka',
      address: post.address || post.location || 'Topka',
      latitude: post.latitude,
      longitude: post.longitude,
      imageUrl,
      viewersCount: 0,
      participantsCount: 0,
      organizerId: post.createdBy || 'topka-admin',
      createdAt: post.publishAt || post.createdAt,
      updatedAt: post.updatedAt,
      postType: post.postType,
      subtitle: post.subtitle,
      tags: this.parseJsonArray(post.tags),
      badges: this.parseJsonArray(post.badges),
      endTime: post.endTime,
      priceText: post.priceText,
      ctaText: post.ctaText,
      ctaUrl: post.ctaUrl,
      priority: post.priority,
      isFeatured: post.isFeatured,
      media: {
        originalUrl: post.originalUrl,
        poster3x4Url: post.poster3x4Url,
        story9x16Url: post.story9x16Url,
        square1x1Url: post.square1x1Url,
        preview16x9Url: post.preview16x9Url,
      },
    };
  }

  private mapTopkaEvent(
    item: TopkaPublishedEvent,
    updatedAt: Date,
    index: number,
  ): EventFeedItem | null {
    const title = (item.title || '').trim();
    if (!title) {
      return null;
    }

    const date = this.parseTopkaDate(item.date);
    const description = (item.description || title).trim();
    const fullDescription = item.fullDescription?.trim() || description;
    const location = (item.venue || item.place || 'Topka').trim();
    const eventId = `topka-${item.id || this.makeStableSlug(title, index)}`;

    return {
      id: eventId,
      title,
      category: this.normalizeCategory(item.category, title, description),
      description,
      fullDescription,
      date,
      startTime: this.normalizeTime(item.time),
      ageLimit: '0+',
      location,
      address: (item.address || location).trim(),
      latitude: null,
      longitude: null,
      imageUrl: this.buildTopkaImageUrl(item.image),
      viewersCount: 0,
      participantsCount: 0,
      organizerId: 'topka-parser',
      createdAt: new Date(updatedAt.getTime() + index * 1000),
      updatedAt,
    };
  }

  private buildTopkaImageUrl(imageUrl?: string): string {
    if (!imageUrl) {
      return 'https://perkly.uz/demo-events/festival.png';
    }

    const trimmed = imageUrl.trim();
    if (!trimmed || this.isTopkaPlaceholderImage(trimmed)) {
      return 'https://perkly.uz/demo-events/festival.png';
    }

    const apiBase = this.getPublicApiBaseUrl();
    const encodedUrl = encodeURIComponent(this.resolveParserMediaUrl(trimmed));
    return `${apiBase}/events/topka-media?url=${encodedUrl}`;
  }

  private mergeEvents(
    dbEvents: EventFeedItem[],
    topkaEvents: EventFeedItem[],
  ): EventFeedItem[] {
    const result: EventFeedItem[] = [];
    const seen = new Set<string>();

    for (const event of [...topkaEvents, ...dbEvents]) {
      const key = [
        this.normalizeText(event.title),
        event.date.toISOString().slice(0, 10),
        this.normalizeText(event.location),
      ].join('|');
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(event);
    }

    return result;
  }

  private compareEventFeedItems(left: EventFeedItem, right: EventFeedItem) {
    const priorityDiff = (right.priority || 0) - (left.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    if (left.isFeatured !== right.isFeatured) {
      return right.isFeatured ? 1 : -1;
    }
    const leftDate = new Date(left.createdAt).getTime();
    const rightDate = new Date(right.createdAt).getTime();
    return rightDate - leftDate;
  }

  private buildEventCacheKey(
    source: string,
    filters: EventQueryFilters,
    pagination: NormalizedPagination,
  ) {
    return `${source}:${JSON.stringify({
      category: filters.category ?? null,
      search: filters.search ?? null,
      skip: pagination.skip,
      take: pagination.take,
    })}`;
  }

  private extractEventQueryFilters(
    where?: Prisma.EventWhereInput,
  ): EventQueryFilters {
    const filters: EventQueryFilters = {};

    if (typeof where?.category === 'string') {
      filters.category = where.category;
    }

    const search = this.extractContainsSearch(where);
    if (search) {
      filters.search = search;
    }

    return filters;
  }

  private extractContainsSearch(where?: Prisma.EventWhereInput) {
    const rules = Array.isArray(where?.OR) ? where.OR : [];

    for (const rule of rules) {
      const titleSearch = this.getContainsValue(rule.title);
      if (titleSearch) return titleSearch;

      const descriptionSearch = this.getContainsValue(rule.description);
      if (descriptionSearch) return descriptionSearch;
    }

    return undefined;
  }

  private getContainsValue(filter: unknown): string | undefined {
    const candidate = filter as { contains?: unknown } | null;
    if (
      candidate &&
      typeof candidate === 'object' &&
      typeof candidate.contains === 'string'
    ) {
      return candidate.contains;
    }

    return undefined;
  }

  private matchesEventQueryFilters(
    event: EventFeedItem,
    filters: EventQueryFilters,
  ) {
    if (filters.category && event.category !== filters.category) {
      return false;
    }

    if (filters.search) {
      const text = `${event.title}\n${event.description}`.toLowerCase();
      return text.includes(filters.search.toLowerCase());
    }

    return true;
  }

  private buildAdminTopkaPostWhere(
    filters: EventQueryFilters,
    now: Date,
  ): Prisma.TopkaPostWhereInput {
    const and: Prisma.TopkaPostWhereInput[] = [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ];

    if (filters.search) {
      and.push({
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.TopkaPostWhereInput = {
      status: 'published',
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
      AND: and,
    };

    if (filters.category) {
      where.category = filters.category;
    }

    return where;
  }

  private matchesWhere(
    event: EventFeedItem,
    where?: Prisma.EventWhereInput,
  ): boolean {
    if (!where) {
      return true;
    }

    if (
      typeof where.category === 'string' &&
      event.category !== where.category
    ) {
      return false;
    }

    if (Array.isArray(where.OR) && where.OR.length > 0) {
      const text = `${event.title}\n${event.description}`.toLowerCase();
      const matched = where.OR.some((rule) => {
        const titleSearch =
          typeof rule?.title === 'object' &&
          rule.title &&
          'contains' in rule.title &&
          typeof rule.title.contains === 'string'
            ? rule.title.contains.toLowerCase()
            : null;
        const descriptionSearch =
          typeof rule?.description === 'object' &&
          rule.description &&
          'contains' in rule.description &&
          typeof rule.description.contains === 'string'
            ? rule.description.contains.toLowerCase()
            : null;
        return (
          (!!titleSearch && text.includes(titleSearch)) ||
          (!!descriptionSearch && text.includes(descriptionSearch))
        );
      });

      if (!matched) {
        return false;
      }
    }

    return true;
  }

  private parseTopkaDate(value?: string): Date {
    if (!value) {
      return new Date();
    }

    const normalized = value.includes('T') ? value : `${value}T00:00:00Z`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private normalizeTime(value?: string): string {
    if (!value) {
      return '00:00';
    }

    const match = value.match(/\b\d{1,2}:\d{2}\b/);
    return match ? match[0].padStart(5, '0') : '00:00';
  }

  private normalizeCategory(
    category?: string,
    title?: string,
    description?: string,
  ): string {
    const value = `${category || ''} ${title || ''} ${description || ''}`
      .toLowerCase()
      .trim();

    if (
      /(concert|концерт|agutin|выступит|выступление|сцена|live)/.test(value)
    ) {
      return 'Концерт';
    }
    if (/(festival|фестиваль|fest)/.test(value)) {
      return 'Фестиваль';
    }
    if (/(exhibition|выставк|галере)/.test(value)) {
      return 'Выставка';
    }
    if (/(party|вечерин|afterparty|dj)/.test(value)) {
      return 'Вечеринка';
    }
    if (/(standup|стендап|комик)/.test(value)) {
      return 'Стендап';
    }
    if (/(food|еда|маркет|ярмарк|фуд)/.test(value)) {
      return 'Фуд-Фест';
    }
    if (/(sport|спорт|матч|турнир)/.test(value)) {
      return 'Спорт';
    }
    return 'Событие';
  }

  private makeStableSlug(value: string, index: number): string {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return slug || `event-${index + 1}`;
  }

  private normalizeText(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private parseJsonArray(value: string): string[] {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private isTopkaPlaceholderImage(value: string): boolean {
    return new Set([
      '/events/parsed-event.jpg',
      '/places/parsed-place.jpg',
      '/places/parsed-promo.jpg',
    ]).has(value.trim());
  }

  private resolveParserMediaUrl(value: string): string {
    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    const base = this.getTopkaParserPublicUrl();
    return new URL(value, `${base}/`).toString();
  }

  private isAllowedParserUrl(value: string): boolean {
    try {
      const target = new URL(value);
      const allowedHosts = new Set(
        [this.getTopkaParserUrl(), this.getTopkaParserPublicUrl()]
          .map((url) => {
            try {
              return new URL(url).host;
            } catch {
              return '';
            }
          })
          .filter(Boolean),
      );

      return allowedHosts.has(target.host);
    } catch {
      return false;
    }
  }

  private getTopkaParserUrl(): string {
    return (
      process.env.TOPKA_PARSER_URL?.trim().replace(/\/+$/, '') ||
      'http://127.0.0.1:8000'
    );
  }

  private getTopkaParserPublicUrl(): string {
    return (
      process.env.TOPKA_PARSER_PUBLIC_URL?.trim().replace(/\/+$/, '') ||
      process.env.FRONTEND_URL?.trim().replace(/\/+$/, '') ||
      'https://perkly.uz'
    );
  }

  private getPublicApiBaseUrl(): string {
    const explicit = process.env.PUBLIC_API_URL?.trim();
    if (explicit) {
      return explicit.replace(/\/+$/, '');
    }

    const frontendUrl = process.env.FRONTEND_URL?.trim();
    if (frontendUrl) {
      return `${frontendUrl.replace(/\/+$/, '')}/api`;
    }

    return 'https://perkly.uz/api';
  }
}
