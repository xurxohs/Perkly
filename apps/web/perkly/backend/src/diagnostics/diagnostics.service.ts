import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type DiagnosticInput = {
  kind: string; message: string; appVersion?: string; osVersion?: string;
  deviceModel?: string; userId?: string; breadcrumbs?: string[];
};

@Injectable()
export class DiagnosticsService {
  constructor(private readonly prisma: PrismaService) {}

  report(input: DiagnosticInput) {
    const kind = input.kind?.trim().slice(0, 40);
    const message = input.message?.trim().slice(0, 8_000);
    if (!kind || !message) throw new BadRequestException('kind and message are required');
    const normalized = message.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '<id>').replace(/\d+/g, '#');
    const fingerprint = createHash('sha256').update(`${kind}|${normalized}|${input.appVersion ?? ''}`).digest('hex');
    return this.prisma.diagnosticIssue.upsert({
      where: { fingerprint },
      create: {
        fingerprint, kind, message, appVersion: input.appVersion?.slice(0, 40),
        osVersion: input.osVersion?.slice(0, 80), deviceModel: input.deviceModel?.slice(0, 120),
        userId: input.userId, breadcrumbs: JSON.stringify((input.breadcrumbs ?? []).slice(-20)),
      },
      update: {
        occurrences: { increment: 1 }, message,
        breadcrumbs: JSON.stringify((input.breadcrumbs ?? []).slice(-20)), userId: input.userId,
      },
      select: { id: true, fingerprint: true, occurrences: true },
    });
  }

  async summary() {
    const [total, issues] = await Promise.all([
      this.prisma.diagnosticIssue.aggregate({ _sum: { occurrences: true } }),
      this.prisma.diagnosticIssue.findMany({ orderBy: [{ occurrences: 'desc' }, { lastSeenAt: 'desc' }], take: 100 }),
    ]);
    return { totalOccurrences: total._sum.occurrences ?? 0, issues };
  }
}
