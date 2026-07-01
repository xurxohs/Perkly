import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    deposit: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    prisma = {
      deposit: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a pending top-up and returns a Click payment URL', async () => {
    prisma.deposit.create.mockResolvedValue({
      id: 'deposit-1',
      userId: 'user-1',
      amount: 10000,
      status: 'PENDING',
    });

    await expect(service.createTopUp('user-1', 10000)).resolves.toMatchObject({
      deposit: { id: 'deposit-1' },
      paymentUrl: expect.stringContaining('transaction_param=deposit-1'),
    });
    expect(prisma.deposit.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        amount: 10000,
        provider: 'CLICK',
        status: 'PENDING',
      },
    });
  });

  it('rejects non-positive top-up amounts', async () => {
    await expect(service.createTopUp('user-1', 0)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('completes a mock top-up only for the deposit owner', async () => {
    const deposit = {
      id: 'deposit-1',
      userId: 'user-1',
      amount: 25000,
      status: 'PENDING',
    };
    const updatedDeposit = { ...deposit, status: 'SUCCESS' };
    const updateDepositResult = Promise.resolve(updatedDeposit);
    const updateUserResult = Promise.resolve({ id: 'user-1', balance: 25000 });

    prisma.deposit.findUnique.mockResolvedValue(deposit);
    prisma.deposit.update.mockReturnValue(updateDepositResult);
    prisma.user.update.mockReturnValue(updateUserResult);
    prisma.$transaction.mockResolvedValue([updatedDeposit, { id: 'user-1' }]);

    await expect(
      service.mockCompleteTopUp('user-1', 'deposit-1', true),
    ).resolves.toEqual(updatedDeposit);

    expect(prisma.$transaction).toHaveBeenCalledWith([
      updateDepositResult,
      updateUserResult,
    ]);
    expect(prisma.deposit.update).toHaveBeenCalledWith({
      where: { id: 'deposit-1' },
      data: { status: 'SUCCESS', providerId: 'mock_deposit-1' },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { balance: { increment: 25000 } },
    });
  });

  it('disables mock top-ups in production', async () => {
    process.env.NODE_ENV = 'production';

    await expect(
      service.mockCompleteTopUp('user-1', 'deposit-1', true),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.deposit.findUnique).not.toHaveBeenCalled();
  });

  it('rejects mock completion for another user deposit', async () => {
    prisma.deposit.findUnique.mockResolvedValue({
      id: 'deposit-1',
      userId: 'other-user',
      amount: 25000,
      status: 'PENDING',
    });

    await expect(
      service.mockCompleteTopUp('user-1', 'deposit-1', true),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects mock completion for missing or already processed deposits', async () => {
    prisma.deposit.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.mockCompleteTopUp('user-1', 'missing', true),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.deposit.findUnique.mockResolvedValueOnce({
      id: 'deposit-1',
      userId: 'user-1',
      amount: 25000,
      status: 'SUCCESS',
    });
    await expect(
      service.mockCompleteTopUp('user-1', 'deposit-1', true),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks a mock top-up as failed without changing balance', async () => {
    prisma.deposit.findUnique.mockResolvedValue({
      id: 'deposit-1',
      userId: 'user-1',
      amount: 25000,
      status: 'PENDING',
    });
    prisma.deposit.update.mockResolvedValue({
      id: 'deposit-1',
      status: 'FAILED',
    });

    await expect(
      service.mockCompleteTopUp('user-1', 'deposit-1', false),
    ).resolves.toEqual({ id: 'deposit-1', status: 'FAILED' });

    expect(prisma.deposit.update).toHaveBeenCalledWith({
      where: { id: 'deposit-1' },
      data: { status: 'FAILED' },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
