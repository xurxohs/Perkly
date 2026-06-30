import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompaniesService } from './companies.service';

describe('CompaniesService', () => {
  let prisma: {
    company: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    user: {
      update: jest.Mock;
    };
  };
  let service: CompaniesService;

  beforeEach(() => {
    prisma = {
      company: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
    };
    service = new CompaniesService(prisma as never);
  });

  it('creates a pending company application with a normalized payload', async () => {
    prisma.company.upsert.mockResolvedValue({
      id: 'company-1',
      status: 'PENDING_MODERATION',
    });

    await service.apply('user-1', {
      legalName: '  Perkly LLC  ',
      brandName: '  Perkly  ',
      inn: '123456789',
      phone: ' +998901234567 ',
    });

    expect(prisma.company.upsert).toHaveBeenCalledWith({
      where: { ownerUserId: 'user-1' },
      update: {
        legalName: 'Perkly LLC',
        brandName: 'Perkly',
        inn: '123456789',
        phone: '+998901234567',
        status: 'PENDING_MODERATION',
      },
      create: {
        ownerUserId: 'user-1',
        legalName: 'Perkly LLC',
        brandName: 'Perkly',
        inn: '123456789',
        phone: '+998901234567',
        status: 'PENDING_MODERATION',
      },
    });
  });

  it('rejects invalid INN values', async () => {
    await expect(
      service.apply('user-1', {
        legalName: 'Perkly LLC',
        brandName: 'Perkly',
        inn: '12345',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.company.upsert).not.toHaveBeenCalled();
  });

  it('returns conflict when INN is already registered', async () => {
    prisma.company.upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.apply('user-1', {
        legalName: 'Perkly LLC',
        brandName: 'Perkly',
        inn: '123456789',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('promotes a company owner to vendor when admin activates the company', async () => {
    prisma.company.update.mockResolvedValue({
      id: 'company-1',
      ownerUserId: 'user-1',
      status: 'ACTIVE',
      owner: { id: 'user-1', role: 'USER' },
    });

    await service.updateStatus('company-1', 'ACTIVE');

    expect(prisma.company.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'company-1' },
        data: { status: 'ACTIVE' },
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'VENDOR' },
    });
  });

  it('demotes a suspended vendor owner back to user', async () => {
    prisma.company.update.mockResolvedValue({
      id: 'company-1',
      ownerUserId: 'user-1',
      status: 'SUSPENDED',
      owner: { id: 'user-1', role: 'VENDOR' },
    });

    await service.updateStatus('company-1', 'SUSPENDED');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'USER' },
    });
  });

  it('rejects invalid moderation statuses', async () => {
    await expect(
      service.updateStatus('company-1', 'APPROVED'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.company.update).not.toHaveBeenCalled();
  });

  it('returns not found when company does not exist', async () => {
    prisma.company.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.updateStatus('missing-company', 'ACTIVE'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
