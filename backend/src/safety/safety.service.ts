import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertAcceptableUserContent } from '../common/content-moderation';

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
const REPORT_ACTIONS = new Set(['NONE', 'HIDE_CONTENT']);

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
      evidence?: string[];
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
    assertAcceptableUserContent(description, 'Report description');
    const evidence = [...new Set((input.evidence ?? []).map((item) => item.trim()).filter(Boolean))];
    if (evidence.length > 5 || evidence.some((item) => item.length > 500)) {
      throw new BadRequestException('Evidence must contain at most 5 short references');
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const reportsToday = await this.prisma.moderationReport.count({
      where: { reporterId, createdAt: { gte: since } },
    });
    if (reportsToday >= 10) {
      throw new BadRequestException('Daily report limit reached');
    }

    const target = await this.resolveTarget(targetType, targetId);
    if (!target) throw new NotFoundException('Reported content not found');
    if (target.ownerId === reporterId) {
      throw new BadRequestException('You cannot report your own content');
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
      data: {
        reporterId,
        targetType,
        targetId,
        category,
        description,
        evidence,
        targetSnapshot: target.snapshot,
        priority: ['FRAUD', 'SAFETY', 'HARASSMENT'].includes(category) ? 2 : 1,
      },
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
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
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
    action = 'NONE',
  ) {
    const normalizedStatus = status?.trim().toUpperCase() ?? '';
    if (!REVIEW_STATUSES.has(normalizedStatus))
      throw new BadRequestException('Invalid status');
    const normalizedAction = action.trim().toUpperCase();
    if (!REPORT_ACTIONS.has(normalizedAction))
      throw new BadRequestException('Invalid moderation action');
    if (normalizedStatus === 'RESOLVED' && (resolution?.trim().length ?? 0) < 3)
      throw new BadRequestException('Resolution is required');
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
          actionTaken: normalizedAction,
        },
      });
      if (normalizedStatus === 'RESOLVED' && normalizedAction === 'HIDE_CONTENT') {
        if (existing.targetType === 'OFFER') {
          await tx.offer.update({
            where: { id: existing.targetId },
            data: {
              isActive: false,
              moderationStatus: 'REJECTED',
              moderationNote: resolution?.trim() || 'Скрыто по жалобе',
              moderationAt: new Date(),
              moderationBy: adminId,
            },
          });
        } else if (existing.targetType === 'EVENT') {
          await tx.event.delete({ where: { id: existing.targetId } });
        } else if (existing.targetType === 'MESSAGE') {
          await tx.message.delete({ where: { id: existing.targetId } });
        } else {
          throw new BadRequestException('This target cannot be hidden');
        }
      }
      await tx.adminLog.create({
        data: {
          adminId,
          action: 'MODERATION_REPORT_UPDATED',
          targetId: id,
          details: JSON.stringify({ status: normalizedStatus, action: normalizedAction, targetType: existing.targetType, targetId: existing.targetId }),
        },
      });
      return result;
    });
  }

  private async resolveTarget(targetType: string, targetId: string): Promise<{ ownerId: string | null; snapshot: object } | null> {
    if (targetType === 'OFFER') {
      const item = await this.prisma.offer.findUnique({ where: { id: targetId }, select: { id: true, title: true, description: true, imageUrl: true, sellerId: true, isActive: true, moderationStatus: true } });
      return item ? { ownerId: item.sellerId, snapshot: item } : null;
    }
    if (targetType === 'EVENT') {
      const item = await this.prisma.event.findUnique({ where: { id: targetId }, select: { id: true, title: true, description: true, imageUrl: true, organizerId: true } });
      return item ? { ownerId: item.organizerId, snapshot: item } : null;
    }
    if (targetType === 'MESSAGE') {
      const item = await this.prisma.message.findUnique({ where: { id: targetId }, select: { id: true, content: true, senderId: true, roomId: true, createdAt: true } });
      return item ? { ownerId: item.senderId, snapshot: item } : null;
    }
    if (targetType === 'USER' || targetType === 'SELLER') {
      const item = await this.prisma.user.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true, displayName: true, role: true, createdAt: true } });
      return item ? { ownerId: item.id, snapshot: item } : null;
    }
    return null;
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
