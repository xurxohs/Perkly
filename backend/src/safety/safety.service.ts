import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const TARGET_TYPES = new Set(['OFFER', 'SELLER', 'EVENT', 'MESSAGE', 'USER']);
const REPORT_CATEGORIES = new Set([
  'FRAUD',
  'MISLEADING',
  'INAPPROPRIATE',
  'HARASSMENT',
  'SPAM',
  'SAFETY',
  'OTHER',
]);
const APPEAL_SUBJECTS = new Set([
  'ACCOUNT',
  'REPORT',
  'TRANSACTION',
  'CONTENT',
]);
const REVIEW_STATUSES = new Set(['REVIEWING', 'RESOLVED', 'REJECTED']);

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(
    reporterId: string,
    input: {
      targetType?: string;
      targetId?: string;
      category?: string;
      description?: string;
    },
  ) {
    const targetType = input.targetType?.trim().toUpperCase() ?? '';
    const category = input.category?.trim().toUpperCase() ?? '';
    const targetId = input.targetId?.trim() ?? '';
    const description = input.description?.trim() ?? '';
    if (!TARGET_TYPES.has(targetType) || !REPORT_CATEGORIES.has(category)) {
      throw new BadRequestException('Invalid report type or category');
    }
    if (!targetId || description.length < 10 || description.length > 2000) {
      throw new BadRequestException(
        'Description must contain 10–2000 characters',
      );
    }

    const duplicate = await this.prisma.moderationReport.findFirst({
      where: {
        reporterId,
        targetType,
        targetId,
        status: { in: ['OPEN', 'REVIEWING'] },
      },
    });
    if (duplicate) return duplicate;
    return this.prisma.moderationReport.create({
      data: { reporterId, targetType, targetId, category, description },
    });
  }

  listMyReports(userId: string) {
    return this.prisma.moderationReport.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAppeal(
    userId: string,
    input: { subjectType?: string; subjectId?: string; reason?: string },
  ) {
    const subjectType = input.subjectType?.trim().toUpperCase() ?? '';
    const subjectId = input.subjectId?.trim() || null;
    const reason = input.reason?.trim() ?? '';
    if (!APPEAL_SUBJECTS.has(subjectType)) {
      throw new BadRequestException('Invalid appeal subject');
    }
    if (reason.length < 20 || reason.length > 3000) {
      throw new BadRequestException('Reason must contain 20–3000 characters');
    }
    const duplicate = await this.prisma.moderationAppeal.findFirst({
      where: {
        userId,
        subjectType,
        subjectId,
        status: { in: ['OPEN', 'REVIEWING'] },
      },
    });
    if (duplicate) return duplicate;
    return this.prisma.moderationAppeal.create({
      data: { userId, subjectType, subjectId, reason },
    });
  }

  listMyAppeals(userId: string) {
    return this.prisma.moderationAppeal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listReports(status?: string) {
    return this.prisma.moderationReport.findMany({
      where: status ? { status: status.toUpperCase() } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
      },
    });
  }

  listAppeals(status?: string) {
    return this.prisma.moderationAppeal.findMany({
      where: status ? { status: status.toUpperCase() } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
      },
    });
  }

  async resolveReport(
    adminId: string,
    id: string,
    status?: string,
    resolution?: string,
  ) {
    const normalizedStatus = status?.trim().toUpperCase() ?? '';
    if (!REVIEW_STATUSES.has(normalizedStatus))
      throw new BadRequestException('Invalid status');
    const existing = await this.prisma.moderationReport.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Report not found');
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.moderationReport.update({
        where: { id },
        data: {
          status: normalizedStatus,
          resolution: resolution?.trim() || null,
          resolvedBy: adminId,
        },
      });
      await tx.adminLog.create({
        data: {
          adminId,
          action: 'MODERATION_REPORT_UPDATED',
          targetId: id,
          details: JSON.stringify({ status: normalizedStatus }),
        },
      });
      return result;
    });
  }

  async resolveAppeal(
    adminId: string,
    id: string,
    status?: string,
    resolution?: string,
  ) {
    const normalizedStatus = status?.trim().toUpperCase() ?? '';
    if (!REVIEW_STATUSES.has(normalizedStatus))
      throw new BadRequestException('Invalid status');
    const existing = await this.prisma.moderationAppeal.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Appeal not found');
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.moderationAppeal.update({
        where: { id },
        data: {
          status: normalizedStatus,
          resolution: resolution?.trim() || null,
          resolvedBy: adminId,
        },
      });
      await tx.adminLog.create({
        data: {
          adminId,
          action: 'MODERATION_APPEAL_UPDATED',
          targetId: id,
          details: JSON.stringify({ status: normalizedStatus }),
        },
      });
      return result;
    });
  }
}
