import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TopkaPost } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

export type MediaVariant =
  | 'original'
  | 'poster3x4'
  | 'story9x16'
  | 'square1x1'
  | 'preview16x9';

export type TopkaPostInput = Partial<{
  postType: string;
  status: string;
  title: string;
  subtitle: string;
  description: string;
  fullDescription: string;
  category: string;
  tags: string[];
  badges: string[];
  date: string | null;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  latitude: number | string | null;
  longitude: number | string | null;
  priceText: string;
  ctaText: string;
  ctaUrl: string;
  priority: number | string;
  isFeatured: boolean;
  publishAt: string | null;
  expiresAt: string | null;
  media: Partial<
    Record<
      | MediaVariant
      | 'originalUrl'
      | 'poster3x4Url'
      | 'story9x16Url'
      | 'square1x1Url'
      | 'preview16x9Url',
      string
    >
  >;
  originalUrl: string;
  poster3x4Url: string;
  story9x16Url: string;
  square1x1Url: string;
  preview16x9Url: string;
  dominantColor: string;
  fallbackGradient: string;
}>;

@Injectable()
export class TopkaAdminService {
  constructor(private prisma: PrismaService) {}

  async list(filters: {
    status?: string;
    postType?: string;
    category?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.TopkaPostWhereInput = {};

    if (filters.status) where.status = filters.status;
    if (filters.postType) where.postType = filters.postType;
    if (filters.category) where.category = filters.category;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const skip = Number(filters.skip || 0);
    const take = Number(filters.take || 50);
    const [posts, total] = await Promise.all([
      this.prisma.topkaPost.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.topkaPost.count({ where }),
    ]);

    return { data: posts.map((post) => this.toDto(post)), total };
  }

  async get(id: string) {
    const post = await this.prisma.topkaPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Topka post not found');
    return this.toDto(post);
  }

  async create(input: TopkaPostInput, adminId: string) {
    const data = this.toPrismaData(
      input,
      adminId,
      true,
    ) as Prisma.TopkaPostCreateInput;
    const post = await this.prisma.topkaPost.create({ data });

    await this.log(adminId, 'CREATE_TOPKA_POST', post.id, input);
    return this.toDto(post);
  }

  async update(id: string, input: TopkaPostInput, adminId: string) {
    const current = await this.prisma.topkaPost.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Topka post not found');

    const nextStatus = input.status || current.status;
    if (nextStatus === 'published' || nextStatus === 'scheduled') {
      this.validatePublishInput({ ...this.toDto(current), ...input });
    }

    const post = await this.prisma.topkaPost.update({
      where: { id },
      data: this.toPrismaData(
        input,
        adminId,
        false,
      ) as Prisma.TopkaPostUpdateInput,
    });

    const action =
      current.status !== post.status
        ? post.status === 'archived'
          ? 'ARCHIVE_TOPKA_POST'
          : post.status === 'published'
            ? 'PUBLISH_TOPKA_POST'
            : post.status === 'scheduled'
              ? 'SCHEDULE_TOPKA_POST'
              : 'UPDATE_TOPKA_STATUS'
        : 'UPDATE_TOPKA_POST';
    await this.log(adminId, action, id, input);
    return this.toDto(post);
  }

  async archive(id: string, adminId: string) {
    return this.update(id, { status: 'archived' }, adminId);
  }

  async saveMedia(input: {
    fileName?: string;
    dataUrl?: string;
    variant?: MediaVariant;
  }) {
    if (!input.dataUrl) {
      throw new BadRequestException('dataUrl is required');
    }

    const parsed = this.parseDataUrl(input.dataUrl);
    const extension =
      this.extensionFromMime(parsed.mime) ||
      extname(input.fileName || '').replace('.', '') ||
      'jpg';
    const variant = input.variant || 'original';
    const safeVariant = variant.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `${Date.now()}-${safeVariant}-${randomUUID()}.${extension}`;
    const uploadDir = join(process.cwd(), 'uploads', 'topka');

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, fileName), parsed.buffer);

    return {
      url: `${this.publicBaseUrl()}/uploads/topka/${fileName}`,
      variant,
      mime: parsed.mime,
      size: parsed.buffer.length,
    };
  }

  private validatePublishInput(input: {
    title?: string | null;
    description?: string | null;
    category?: string | null;
    date?: string | Date | null;
    media?: Partial<
      Record<MediaVariant | 'poster3x4Url' | 'originalUrl', string | null>
    >;
    poster3x4Url?: string | null;
    originalUrl?: string | null;
  }) {
    const missing: string[] = [];
    if (!input.title?.trim()) missing.push('title');
    if (!input.description?.trim()) missing.push('description');
    if (!input.category?.trim()) missing.push('category');
    if (!input.date) missing.push('date');
    if (
      !input.media?.poster3x4 &&
      !input.media?.poster3x4Url &&
      !input.media?.originalUrl &&
      !input.poster3x4Url &&
      !input.originalUrl
    ) {
      missing.push('poster3x4Url');
    }

    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required fields for publish: ${missing.join(', ')}`,
      );
    }
  }
  private toPrismaData(
    input: TopkaPostInput,
    adminId: string,
    isCreate: boolean,
  ): Prisma.TopkaPostCreateInput | Prisma.TopkaPostUpdateInput {
    const media = input.media || {};
    const data: Record<string, unknown> = {
      updatedBy: adminId,
    };

    if (isCreate) {
      Object.assign(data, {
        title: input.title?.trim() || 'Новый пост',
        description: input.description?.trim() || '',
        category: input.category?.trim() || 'Событие',
        createdBy: adminId,
      });
    }

    this.assignString(data, 'postType', input.postType);
    this.assignString(data, 'status', input.status);
    this.assignString(data, 'title', input.title);
    this.assignString(data, 'subtitle', input.subtitle);
    this.assignString(data, 'description', input.description);
    this.assignString(data, 'fullDescription', input.fullDescription);
    this.assignString(data, 'category', input.category);
    this.assignString(data, 'startTime', input.startTime);
    this.assignString(data, 'endTime', input.endTime);
    this.assignString(data, 'location', input.location);
    this.assignString(data, 'address', input.address);
    this.assignString(data, 'priceText', input.priceText);
    this.assignString(data, 'ctaText', input.ctaText);
    this.assignString(data, 'ctaUrl', input.ctaUrl);
    this.assignString(data, 'dominantColor', input.dominantColor);
    this.assignString(data, 'fallbackGradient', input.fallbackGradient);

    if (input.tags) data.tags = JSON.stringify(input.tags);
    if (input.badges) data.badges = JSON.stringify(input.badges);
    if ('date' in input) data.date = this.toDate(input.date);
    if ('publishAt' in input) data.publishAt = this.toDate(input.publishAt);
    if ('expiresAt' in input) data.expiresAt = this.toDate(input.expiresAt);
    if ('latitude' in input) data.latitude = this.toNumber(input.latitude);
    if ('longitude' in input) data.longitude = this.toNumber(input.longitude);
    if ('priority' in input) data.priority = Number(input.priority || 0);
    if ('isFeatured' in input) data.isFeatured = Boolean(input.isFeatured);

    this.assignString(
      data,
      'originalUrl',
      media.original || media.originalUrl || input.originalUrl,
    );
    this.assignString(
      data,
      'poster3x4Url',
      media.poster3x4 || media.poster3x4Url || input.poster3x4Url,
    );
    this.assignString(
      data,
      'story9x16Url',
      media.story9x16 || media.story9x16Url || input.story9x16Url,
    );
    this.assignString(
      data,
      'square1x1Url',
      media.square1x1 || media.square1x1Url || input.square1x1Url,
    );
    this.assignString(
      data,
      'preview16x9Url',
      media.preview16x9 || media.preview16x9Url || input.preview16x9Url,
    );

    return data as Prisma.TopkaPostCreateInput | Prisma.TopkaPostUpdateInput;
  }

  private assignString(
    data: Record<string, unknown>,
    key: string,
    value?: string,
  ) {
    if (value !== undefined) {
      data[key] = value.trim();
    }
  }

  private toDate(value?: string | null) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid date: ${value}`);
    }
    return parsed;
  }

  private toNumber(value?: number | string | null) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException(`Invalid number: ${value}`);
    }
    return parsed;
  }

  private toDto(post: TopkaPost) {
    return {
      ...post,
      tags: this.parseJsonArray(post.tags),
      badges: this.parseJsonArray(post.badges),
      media: {
        originalUrl: post.originalUrl,
        poster3x4Url: post.poster3x4Url,
        story9x16Url: post.story9x16Url,
        square1x1Url: post.square1x1Url,
        preview16x9Url: post.preview16x9Url,
      },
    };
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

  private parseDataUrl(dataUrl: string) {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new BadRequestException('Expected a base64 data URL');
    }
    return {
      mime: match[1],
      buffer: Buffer.from(match[2], 'base64'),
    };
  }

  private extensionFromMime(mime: string) {
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
    return null;
  }

  private publicBaseUrl() {
    const explicit = process.env.PUBLIC_API_URL?.trim();
    if (explicit) return explicit.replace(/\/+$/, '');
    return `http://127.0.0.1:${process.env.PORT || 3001}`;
  }

  private async log(
    adminId: string,
    action: string,
    targetId: string,
    details?: unknown,
  ) {
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action,
        targetId,
        details: details ? JSON.stringify(details) : undefined,
      },
    });
  }
}
