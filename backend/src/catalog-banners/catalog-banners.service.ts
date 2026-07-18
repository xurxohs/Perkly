import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type BannerInput = { imageUrl?: unknown; href?: unknown; altText?: unknown; width?: unknown; height?: unknown; sortOrder?: unknown; isActive?: unknown };

@Injectable()
export class CatalogBannersService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.catalogBanner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  listAdmin() {
    return this.prisma.catalogBanner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
  }

  create(input: BannerInput) {
    const data = this.normalize(input, true);
    return this.prisma.catalogBanner.create({ data: data as never });
  }

  async update(id: string, input: BannerInput) {
    await this.ensureExists(id);
    return this.prisma.catalogBanner.update({ where: { id }, data: this.normalize(input, false) });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.catalogBanner.delete({ where: { id } });
  }

  private normalize(input: BannerInput, requireImage: boolean) {
    const data: { imageUrl?: string; href?: string; altText?: string; width?: number; height?: number; sortOrder?: number; isActive?: boolean } = {};
    if (requireImage || input.imageUrl !== undefined) {
      const imageUrl = String(input.imageUrl ?? '').trim();
      if (!imageUrl || (!imageUrl.startsWith('https://') && !imageUrl.startsWith('/'))) throw new BadRequestException('Некорректный URL изображения');
      data.imageUrl = imageUrl;
    }
    if (input.href !== undefined) {
      const href = String(input.href).trim();
      if (!href || (!href.startsWith('/') && !href.startsWith('https://'))) throw new BadRequestException('Некорректная ссылка');
      data.href = href;
    }
    if (input.altText !== undefined) data.altText = String(input.altText).trim().slice(0, 160) || 'Баннер Perkly';
    if (input.width !== undefined) data.width = Math.max(1, Math.min(10000, Math.round(Number(input.width) || 1600)));
    if (input.height !== undefined) data.height = Math.max(1, Math.min(10000, Math.round(Number(input.height) || 600)));
    if (input.sortOrder !== undefined) data.sortOrder = Math.max(-1000, Math.min(1000, Math.round(Number(input.sortOrder) || 0)));
    if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);
    return data;
  }

  private async ensureExists(id: string) {
    if (!await this.prisma.catalogBanner.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Баннер не найден');
  }
}
