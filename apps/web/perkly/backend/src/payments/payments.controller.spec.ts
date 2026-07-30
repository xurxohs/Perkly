import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: {
    createTopUp: jest.Mock;
    processClickWebhook: jest.Mock;
    mockCompleteTopUp: jest.Mock;
  };

  beforeEach(async () => {
    paymentsService = {
      createTopUp: jest.fn(),
      processClickWebhook: jest.fn(),
      mockCompleteTopUp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: paymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a top-up for the authenticated user', async () => {
    paymentsService.createTopUp.mockResolvedValue({ deposit: { id: 'dep-1' } });

    await expect(
      controller.createTopUp(
        { user: { userId: 'user-1' } },
        { amount: 10000, idempotencyKey: 'topup-key' },
      ),
    ).resolves.toEqual({ deposit: { id: 'dep-1' } });

    expect(paymentsService.createTopUp).toHaveBeenCalledWith(
      'user-1',
      10000,
      'topup-key',
    );
  });

  it('completes a mock webhook for the authenticated user', async () => {
    paymentsService.mockCompleteTopUp.mockResolvedValue({ id: 'dep-1' });

    await expect(
      controller.mockWebhook(
        { user: { userId: 'user-1' } },
        { depositId: 'dep-1' },
      ),
    ).resolves.toEqual({ id: 'dep-1' });

    expect(paymentsService.mockCompleteTopUp).toHaveBeenCalledWith(
      'user-1',
      'dep-1',
      true,
    );
  });

  it('passes explicit mock webhook failure to the service', async () => {
    paymentsService.mockCompleteTopUp.mockResolvedValue({ id: 'dep-1' });

    await controller.mockWebhook(
      { user: { userId: 'user-1' } },
      { depositId: 'dep-1', success: false },
    );

    expect(paymentsService.mockCompleteTopUp).toHaveBeenCalledWith(
      'user-1',
      'dep-1',
      false,
    );
  });
});
