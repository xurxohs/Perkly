import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const COMPANY_STATUSES = [
  'PENDING_MODERATION',
  'ACTIVE',
  'SUSPENDED',
] as const;

export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export interface CompanyApplicationInput {
  legalName?: unknown;
  brandName?: unknown;
  inn?: unknown;
  phone?: unknown;
}

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  getMyCompany(ownerUserId: string) {
    return this.prisma.company.findUnique({
      where: { ownerUserId },
      include: {
        _count: {
          select: {
            offers: true,
            promocodes: true,
          },
        },
      },
    });
  }

  async apply(ownerUserId: string, input: CompanyApplicationInput) {
    const legalName = this.requiredString(input.legalName, 'legalName');
    const brandName = this.requiredString(input.brandName, 'brandName');
    const inn = this.normalizeInn(input.inn);
    const phone = this.optionalString(input.phone);

    try {
      return await this.prisma.company.upsert({
        where: { ownerUserId },
        update: {
          legalName,
          brandName,
          inn,
          phone,
          status: 'PENDING_MODERATION',
        },
        create: {
          ownerUserId,
          legalName,
          brandName,
          inn,
          phone,
          status: 'PENDING_MODERATION',
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Company INN is already registered');
      }
      throw error;
    }
  }

  list(status?: unknown) {
    const normalizedStatus = status
      ? this.normalizeStatus(status)
      : undefined;

    return this.prisma.company.findMany({
      where: normalizedStatus ? { status: normalizedStatus } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            phone: true,
            telegramId: true,
          },
        },
        _count: {
          select: {
            offers: true,
            promocodes: true,
          },
        },
      },
    });
  }

  async updateStatus(companyId: string, status: unknown) {
    const normalizedStatus = this.normalizeStatus(status);

    try {
      const company = await this.prisma.company.update({
        where: { id: companyId },
        data: { status: normalizedStatus },
        include: {
          owner: {
            select: {
              id: true,
              role: true,
            },
          },
        },
      });

      if (normalizedStatus === 'ACTIVE' && company.owner.role !== 'ADMIN') {
        await this.prisma.user.update({
          where: { id: company.ownerUserId },
          data: { role: 'VENDOR' },
        });
      }

      if (normalizedStatus === 'SUSPENDED' && company.owner.role === 'VENDOR') {
        await this.prisma.user.update({
          where: { id: company.ownerUserId },
          data: { role: 'USER' },
        });
      }

      return company;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Company not found');
      }
      throw error;
    }
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

  private normalizeInn(value: unknown): string {
    const inn = this.requiredString(value, 'inn');
    if (!/^\d{9}$/.test(inn)) {
      throw new BadRequestException('inn must contain exactly 9 digits');
    }
    return inn;
  }

  private normalizeStatus(value: unknown): CompanyStatus {
    const status = this.requiredString(value, 'status');
    if (!COMPANY_STATUSES.includes(status as CompanyStatus)) {
      throw new BadRequestException(
        `status must be one of: ${COMPANY_STATUSES.join(', ')}`,
      );
    }
    return status as CompanyStatus;
  }
}
