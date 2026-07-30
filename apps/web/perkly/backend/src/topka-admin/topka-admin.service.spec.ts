import { BadRequestException } from '@nestjs/common';
import { TopkaAdminService } from './topka-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

describe('TopkaAdminService', () => {
  const invokeMapper = (
    service: TopkaAdminService,
    input: Record<string, unknown>,
  ) =>
    (
      service as unknown as {
        toPrismaData: (
          input: Record<string, unknown>,
          adminId: string,
          isCreate: boolean,
        ) => Record<string, unknown>;
      }
    ).toPrismaData(input, 'admin-1', false);

  it('ignores null optional strings instead of crashing on trim', () => {
    const service = new TopkaAdminService(
      {} as PrismaService,
      {} as StorageService,
    );

    expect(
      invokeMapper(service, {
        title: null,
        subtitle: null,
        ctaUrl: null,
        media: { originalUrl: null },
      }),
    ).toEqual({ updatedBy: 'admin-1' });
  });

  it('rejects non-string values for string fields', () => {
    const service = new TopkaAdminService(
      {} as PrismaService,
      {} as StorageService,
    );

    expect(() => invokeMapper(service, { title: 123 })).toThrow(
      BadRequestException,
    );
  });
});
