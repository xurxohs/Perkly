import { Test, TestingModule } from '@nestjs/testing';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { ForbiddenException } from '@nestjs/common';
import { DisputeStatus, Role } from '../common/enums';

describe('DisputesController', () => {
  let controller: DisputesController;
  let disputesService: { resolveDispute: jest.Mock };

  beforeEach(async () => {
    disputesService = { resolveDispute: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisputesController],
      providers: [{ provide: DisputesService, useValue: disputesService }],
    }).compile();

    controller = module.get<DisputesController>(DisputesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('does not allow a seller to resolve their own dispute', async () => {
    await expect(
      controller.resolveDispute(
        'dispute-1',
        { user: { userId: 'seller-1', role: 'VENDOR' as Role } },
        { status: DisputeStatus.RESOLVED },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(disputesService.resolveDispute).not.toHaveBeenCalled();
  });

  it('allows an administrator to resolve a dispute', async () => {
    disputesService.resolveDispute.mockResolvedValue({ id: 'dispute-1' });
    await expect(
      controller.resolveDispute(
        'dispute-1',
        { user: { userId: 'admin-1', role: Role.ADMIN } },
        { status: DisputeStatus.CLOSED },
      ),
    ).resolves.toEqual({ id: 'dispute-1' });
    expect(disputesService.resolveDispute).toHaveBeenCalledWith(
      'dispute-1',
      'admin-1',
      DisputeStatus.CLOSED,
    );
  });
});
