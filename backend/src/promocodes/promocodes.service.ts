import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma, Promocode, PromocodeActivation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PROMOCODE_STATUSES = ['ACTIVE', 'PAUSED', 'ARCHIVED'] as const;
const CODE_TYPES = ['STATIC', 'DYNAMIC'] as const;
const ACTIVATION_SELECT = {
  id: true,
  userId: true,
  promocodeId: true,
  offerId: true,
  status: true,
  codeSnapshot: true,
  copiedAt: true,
  usedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  promocode: {
    select: {
      id: true,
      title: true,
      description: true,
      discountValue: true,
      maxActivations: true,
      perUserLimit: true,
      codeType: true,
      status: true,
      validFrom: true,
      validTo: true,
      offer: {
        select: {
          id: true,
          title: true,
          vendorLogo: true,
          category: true,
        },
      },
      company: {
        select: {
          id: true,
          brandName: true,
        },
      },
    },
  },
} satisfies Prisma.PromocodeActivationSelect;

export type PromocodeStatus = (typeof PROMOCODE_STATUSES)[number];
export type PromocodeCodeType = (typeof CODE_TYPES)[number];

export interface PromocodeInput {
  companyId?: unknown;
  offerId?: unknown;
  title?: unknown;
  description?: unknown;
  codeType?: unknown;
  code?: unknown;
  discountValue?: unknown;
  maxActivations?: unknown;
  perUserLimit?: unknown;
  validFrom?: unknown;
  validTo?: unknown;
  status?: unknown;
}

export interface CompanyPromocodeAnalytics {
  summary: {
    totalPromocodes: number;
    activePromocodes: number;
    totalActivations: number;
    copiedActivations: number;
    usedActivations: number;
    copyRate: number;
    useRate: number;
  };
  promocodes: {
    id: string;
    title: string;
    status: string;
    discountValue: number;
    maxActivations: number | null;
    perUserLimit: number;
    offerTitle: string | null;
    activations: number;
    copied: number;
    used: number;
    issued: number;
    copyRate: number;
    useRate: number;
    quotaUsedRate: number | null;
  }[];
}

@Injectable()
export class PromocodesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForMyCompany(userId: string, role?: string): Promise<Promocode[]> {
    const company = await this.getManagedCompany(userId, role);

    return this.prisma.promocode.findMany({
      where: { companyId: company.id },
      include: {
        offer: {
          select: {
            id: true,
            title: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            activations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCompanyAnalytics(
    userId: string,
    role?: string,
  ): Promise<CompanyPromocodeAnalytics> {
    const company = await this.getManagedCompany(userId, role);
    const promocodes = await this.prisma.promocode.findMany({
      where: { companyId: company.id },
      select: {
        id: true,
        title: true,
        status: true,
        discountValue: true,
        maxActivations: true,
        perUserLimit: true,
        offer: { select: { title: true } },
        activations: {
          select: {
            status: true,
            copiedAt: true,
            usedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalActivations = 0;
    let copiedActivations = 0;
    let usedActivations = 0;

    const analytics = promocodes.map((promocode) => {
      const activations = promocode.activations.length;
      const copied = promocode.activations.filter(
        (activation) => activation.status === 'COPIED' || activation.copiedAt,
      ).length;
      const used = promocode.activations.filter(
        (activation) => activation.status === 'USED' || activation.usedAt,
      ).length;
      const issued = Math.max(0, activations - copied - used);

      totalActivations += activations;
      copiedActivations += copied;
      usedActivations += used;

      return {
        id: promocode.id,
        title: promocode.title,
        status: promocode.status,
        discountValue: promocode.discountValue,
        maxActivations: promocode.maxActivations,
        perUserLimit: promocode.perUserLimit,
        offerTitle: promocode.offer?.title ?? null,
        activations,
        copied,
        used,
        issued,
        copyRate: this.percent(copied, activations),
        useRate: this.percent(used, activations),
        quotaUsedRate: promocode.maxActivations
          ? this.percent(activations, promocode.maxActivations)
          : null,
      };
    });

    return {
      summary: {
        totalPromocodes: promocodes.length,
        activePromocodes: promocodes.filter(
          (promocode) => promocode.status === 'ACTIVE',
        ).length,
        totalActivations,
        copiedActivations,
        usedActivations,
        copyRate: this.percent(copiedActivations, totalActivations),
        useRate: this.percent(usedActivations, totalActivations),
      },
      promocodes: analytics,
    };
  }

  async listPublicForOffer(offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, companyId: true, isActive: true },
    });

    if (!offer || !offer.isActive) {
      throw new NotFoundException('Offer not found');
    }

    const now = new Date();

    return this.prisma.promocode.findMany({
      where: {
        status: 'ACTIVE',
        companyId: offer.companyId ?? undefined,
        OR: [{ offerId }, { offerId: null }],
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validTo: null }, { validTo: { gte: now } }] },
        ],
      },
      select: {
        id: true,
        companyId: true,
        offerId: true,
        title: true,
        description: true,
        codeType: true,
        discountValue: true,
        maxActivations: true,
        perUserLimit: true,
        validFrom: true,
        validTo: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        offer: {
          select: {
            id: true,
            title: true,
            vendorLogo: true,
            category: true,
            isActive: true,
          },
        },
        company: {
          select: {
            id: true,
            brandName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    userId: string,
    role: string | undefined,
    input: PromocodeInput,
  ): Promise<Promocode> {
    const company = await this.getManagedCompany(userId, role, input.companyId);
    this.ensureCompanyActive(company.status);
    const data = await this.normalizePromocodeInput(input, company.id, true);

    return this.prisma.promocode.create({
      data: {
        company: { connect: { id: company.id } },
        ...(data.offerId ? { offer: { connect: { id: data.offerId } } } : {}),
        title: data.title!,
        description: data.description,
        codeType: data.codeType,
        code: data.code,
        discountValue: data.discountValue!,
        maxActivations: data.maxActivations,
        perUserLimit: data.perUserLimit,
        validFrom: data.validFrom,
        validTo: data.validTo,
        status: data.status,
      },
    });
  }

  async update(
    userId: string,
    role: string | undefined,
    promocodeId: string,
    input: PromocodeInput,
  ): Promise<Promocode> {
    const promocode = await this.getOwnedPromocode(userId, role, promocodeId);
    const data = await this.normalizePromocodeInput(
      input,
      promocode.companyId,
      false,
      promocode,
    );

    return this.prisma.promocode.update({
      where: { id: promocodeId },
      data: {
        ...(data.offerId !== undefined
          ? data.offerId
            ? { offer: { connect: { id: data.offerId } } }
            : { offer: { disconnect: true } }
          : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.codeType !== undefined ? { codeType: data.codeType } : {}),
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.discountValue !== undefined
          ? { discountValue: data.discountValue }
          : {}),
        ...(data.maxActivations !== undefined
          ? { maxActivations: data.maxActivations }
          : {}),
        ...(data.perUserLimit !== undefined
          ? { perUserLimit: data.perUserLimit }
          : {}),
        ...(data.validFrom !== undefined ? { validFrom: data.validFrom } : {}),
        ...(data.validTo !== undefined ? { validTo: data.validTo } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  async updateStatus(
    userId: string,
    role: string | undefined,
    promocodeId: string,
    status: unknown,
  ): Promise<Promocode> {
    await this.getOwnedPromocode(userId, role, promocodeId);

    return this.prisma.promocode.update({
      where: { id: promocodeId },
      data: { status: this.normalizeStatus(status) },
    });
  }

  async activate(
    userId: string,
    promocodeId: string,
  ): Promise<PromocodeActivation> {
    const promocode = await this.prisma.promocode.findUnique({
      where: { id: promocodeId },
      include: {
        offer: { select: { id: true, isActive: true } },
      },
    });

    if (!promocode) throw new NotFoundException('Promocode not found');
    this.ensurePromocodeUsable(promocode);

    const [existing, userActivationCount, totalActivationCount] =
      await Promise.all([
        this.prisma.promocodeActivation.findFirst({
          where: {
            userId,
            promocodeId,
            status: { in: ['ISSUED', 'COPIED'] },
          },
          orderBy: { createdAt: 'desc' },
          select: ACTIVATION_SELECT,
        }),
        this.prisma.promocodeActivation.count({
          where: { userId, promocodeId },
        }),
        promocode.maxActivations
          ? this.prisma.promocodeActivation.count({
              where: { promocodeId },
            })
          : Promise.resolve(0),
      ]);

    if (existing) {
      return existing as PromocodeActivation;
    }

    if (userActivationCount >= promocode.perUserLimit) {
      throw new BadRequestException('Promocode user limit reached');
    }

    if (
      promocode.maxActivations &&
      totalActivationCount >= promocode.maxActivations
    ) {
      throw new BadRequestException('Promocode activation limit reached');
    }

    return this.prisma.promocodeActivation.create({
      data: {
        user: { connect: { id: userId } },
        promocode: { connect: { id: promocode.id } },
        ...(promocode.offerId
          ? { offer: { connect: { id: promocode.offerId } } }
          : {}),
        status: 'ISSUED',
        codeSnapshot: this.createCodeSnapshot(promocode),
        expiresAt: promocode.validTo,
      },
      select: ACTIVATION_SELECT,
    }) as Promise<PromocodeActivation>;
  }

  async copyActivation(
    userId: string,
    activationId: string,
  ): Promise<PromocodeActivation> {
    const activation = await this.getOwnedActivation(userId, activationId);
    this.ensureActivationUsable(activation);

    return this.prisma.promocodeActivation.update({
      where: { id: activationId },
      data: {
        status: 'COPIED',
        copiedAt: new Date(),
      },
      select: ACTIVATION_SELECT,
    }) as Promise<PromocodeActivation>;
  }

  async useActivation(
    userId: string,
    activationId: string,
  ): Promise<PromocodeActivation> {
    const activation = await this.getOwnedActivation(userId, activationId);
    this.ensureActivationUsable(activation);

    return this.prisma.promocodeActivation.update({
      where: { id: activationId },
      data: {
        status: 'USED',
        usedAt: new Date(),
      },
      select: ACTIVATION_SELECT,
    }) as Promise<PromocodeActivation>;
  }

  listMyActivations(userId: string): Promise<PromocodeActivation[]> {
    return this.prisma.promocodeActivation.findMany({
      where: { userId },
      select: ACTIVATION_SELECT,
      orderBy: { createdAt: 'desc' },
    }) as Promise<PromocodeActivation[]>;
  }

  private async getManagedCompany(
    userId: string,
    role?: string,
    companyId?: unknown,
  ) {
    if (role === 'ADMIN' && companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: this.requiredString(companyId, 'companyId') },
      });
      if (!company) throw new NotFoundException('Company not found');
      return company;
    }

    const company = await this.prisma.company.findUnique({
      where: { ownerUserId: userId },
    });
    if (!company) {
      throw new ForbiddenException('Company is required');
    }
    return company;
  }

  private async getOwnedPromocode(
    userId: string,
    role: string | undefined,
    promocodeId: string,
  ) {
    const promocode = await this.prisma.promocode.findUnique({
      where: { id: promocodeId },
      include: { company: { select: { ownerUserId: true } } },
    });
    if (!promocode) throw new NotFoundException('Promocode not found');
    if (role !== 'ADMIN' && promocode.company.ownerUserId !== userId) {
      throw new ForbiddenException('You cannot manage this promocode');
    }
    return promocode;
  }

  private async getOwnedActivation(userId: string, activationId: string) {
    const activation = await this.prisma.promocodeActivation.findUnique({
      where: { id: activationId },
      select: ACTIVATION_SELECT,
    });

    if (!activation) throw new NotFoundException('Activation not found');
    if (activation.userId !== userId) {
      throw new ForbiddenException('You cannot manage this activation');
    }
    return activation;
  }

  private async normalizePromocodeInput(
    input: PromocodeInput,
    companyId: string,
    requireAll: boolean,
    current?: Promocode,
  ) {
    const title = requireAll
      ? this.requiredString(input.title, 'title')
      : this.optionalString(input.title);
    const description = this.optionalString(input.description);
    const discountValue = requireAll
      ? this.normalizeDiscount(input.discountValue)
      : input.discountValue !== undefined
        ? this.normalizeDiscount(input.discountValue)
        : undefined;
    const maxActivations =
      input.maxActivations !== undefined
        ? this.optionalPositiveInteger(input.maxActivations, 'maxActivations')
        : undefined;
    const perUserLimit =
      input.perUserLimit !== undefined
        ? this.normalizePositiveInteger(input.perUserLimit, 'perUserLimit')
        : requireAll
          ? 1
          : undefined;
    const codeType = requireAll
      ? this.normalizeCodeType(input.codeType ?? 'STATIC')
      : input.codeType !== undefined
        ? this.normalizeCodeType(input.codeType)
        : undefined;
    const effectiveCodeType = codeType ?? current?.codeType ?? 'STATIC';
    const code = this.normalizeCodeForInput(
      input.code,
      effectiveCodeType,
      requireAll,
      current,
      codeType !== undefined,
    );
    const validFrom =
      input.validFrom !== undefined
        ? this.optionalDate(input.validFrom, 'validFrom')
        : undefined;
    const validTo =
      input.validTo !== undefined
        ? this.optionalDate(input.validTo, 'validTo')
        : undefined;
    const status =
      input.status !== undefined
        ? this.normalizeStatus(input.status)
        : requireAll
          ? 'ACTIVE'
          : undefined;

    this.validateDateRange(
      validFrom ?? current?.validFrom ?? null,
      validTo ?? current?.validTo ?? null,
    );

    const offerId =
      input.offerId !== undefined
        ? (this.optionalString(input.offerId) ?? null)
        : undefined;

    if (offerId) {
      await this.ensureOfferBelongsToCompany(offerId, companyId);
    }

    return {
      title,
      description,
      codeType,
      code,
      discountValue,
      maxActivations,
      perUserLimit,
      validFrom,
      validTo,
      status,
      offerId,
    };
  }

  private async ensureOfferBelongsToCompany(
    offerId: string,
    companyId: string,
  ) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, companyId: true },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.companyId !== companyId) {
      throw new ForbiddenException('Offer does not belong to this company');
    }
  }

  private ensureCompanyActive(status: string) {
    if (status !== 'ACTIVE') {
      throw new ForbiddenException('Active company is required');
    }
  }

  private ensurePromocodeUsable(
    promocode: Promocode & { offer?: { id: string; isActive: boolean } | null },
  ) {
    if (promocode.status !== 'ACTIVE') {
      throw new BadRequestException('Promocode is not active');
    }
    if (promocode.offer && !promocode.offer.isActive) {
      throw new BadRequestException('Promocode offer is not active');
    }

    const now = new Date();
    if (promocode.validFrom && promocode.validFrom > now) {
      throw new BadRequestException('Promocode is not active yet');
    }
    if (promocode.validTo && promocode.validTo < now) {
      throw new BadRequestException('Promocode is expired');
    }
  }

  private ensureActivationUsable(
    activation: Pick<PromocodeActivation, 'status' | 'expiresAt'>,
  ) {
    if (activation.status === 'USED') {
      throw new BadRequestException('Activation is already used');
    }
    if (activation.expiresAt && activation.expiresAt < new Date()) {
      throw new BadRequestException('Activation is expired');
    }
  }

  private createCodeSnapshot(promocode: Promocode): string | undefined {
    if (promocode.codeType === 'STATIC') {
      return promocode.code ?? undefined;
    }

    return `PRKLY-${cryptoRandom(8)}`;
  }

  private requiredString(value: unknown, field: string): string {
    const normalized = this.optionalString(value);
    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }
    return normalized;
  }

  private optionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeDiscount(value: unknown): number {
    const discount = Number(value);
    if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
      throw new BadRequestException('discountValue must be between 0 and 100');
    }
    return discount;
  }

  private percent(part: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Number(((part / total) * 100).toFixed(1));
  }

  private optionalPositiveInteger(
    value: unknown,
    field: string,
  ): number | null {
    if (value === null || value === '') return null;
    return this.normalizePositiveInteger(value, field);
  }

  private normalizePositiveInteger(value: unknown, field: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }
    return parsed;
  }

  private normalizeCodeType(value: unknown): PromocodeCodeType {
    const codeType = this.requiredString(value, 'codeType').toUpperCase();
    if (!CODE_TYPES.includes(codeType as PromocodeCodeType)) {
      throw new BadRequestException(
        `codeType must be one of: ${CODE_TYPES.join(', ')}`,
      );
    }
    return codeType as PromocodeCodeType;
  }

  private normalizeCode(
    value: unknown,
    codeType: PromocodeCodeType | string,
  ): string | null {
    if (codeType === 'DYNAMIC') {
      return this.optionalString(value)?.toUpperCase() ?? null;
    }

    const code = this.requiredString(value, 'code')
      .toUpperCase()
      .replace(/\s+/g, '');
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      throw new BadRequestException(
        'code must contain 3-32 latin letters, digits, _ or -',
      );
    }
    return code;
  }

  private normalizeCodeForInput(
    value: unknown,
    codeType: PromocodeCodeType | string,
    requireAll: boolean,
    current: Promocode | undefined,
    codeTypeChanged: boolean,
  ): string | null | undefined {
    if (value !== undefined || requireAll) {
      return this.normalizeCode(value, codeType);
    }

    if (codeTypeChanged && codeType === 'DYNAMIC') {
      return null;
    }

    if (codeTypeChanged && codeType === 'STATIC' && !current?.code) {
      throw new BadRequestException('code is required');
    }

    return undefined;
  }

  private normalizeStatus(value: unknown): PromocodeStatus {
    const status = this.requiredString(value, 'status').toUpperCase();
    if (!PROMOCODE_STATUSES.includes(status as PromocodeStatus)) {
      throw new BadRequestException(
        `status must be one of: ${PROMOCODE_STATUSES.join(', ')}`,
      );
    }
    return status as PromocodeStatus;
  }

  private optionalDate(value: unknown, field: string): Date | null {
    if (value === null || value === '') return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    throw new BadRequestException(`${field} must be a valid date`);
  }

  private validateDateRange(validFrom?: Date | null, validTo?: Date | null) {
    if (validFrom && validTo && validTo <= validFrom) {
      throw new BadRequestException('validTo must be after validFrom');
    }
  }
}

function cryptoRandom(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += alphabet[crypto.randomInt(alphabet.length)];
  }
  return value;
}
