import { PromocodesController } from './promocodes.controller';
import { PromocodesService } from './promocodes.service';

describe('PromocodesController', () => {
  let service: {
    listForMyCompany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateStatus: jest.Mock;
    activate: jest.Mock;
    copyActivation: jest.Mock;
    useActivation: jest.Mock;
    listMyActivations: jest.Mock;
  };
  let controller: PromocodesController;

  beforeEach(() => {
    service = {
      listForMyCompany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      activate: jest.fn(),
      copyActivation: jest.fn(),
      useActivation: jest.fn(),
      listMyActivations: jest.fn(),
    };
    controller = new PromocodesController(
      service as unknown as PromocodesService,
    );
  });

  it('lists promocodes for the authenticated company owner', async () => {
    service.listForMyCompany.mockResolvedValue([]);

    await controller.listForMyCompany({
      user: { userId: 'seller-1', role: 'VENDOR' },
    } as never);

    expect(service.listForMyCompany).toHaveBeenCalledWith('seller-1', 'VENDOR');
  });

  it('creates a promocode for the authenticated company owner', async () => {
    const body = {
      title: 'Launch',
      code: 'LAUNCH10',
      discountValue: 10,
    };
    service.create.mockResolvedValue({ id: 'promo-1' });

    await controller.create(
      { user: { userId: 'seller-1', role: 'VENDOR' } } as never,
      body,
    );

    expect(service.create).toHaveBeenCalledWith('seller-1', 'VENDOR', body);
  });

  it('updates promocode status for the authenticated owner', async () => {
    service.updateStatus.mockResolvedValue({ id: 'promo-1' });

    await controller.updateStatus(
      { user: { userId: 'seller-1', role: 'VENDOR' } } as never,
      'promo-1',
      'PAUSED',
    );

    expect(service.updateStatus).toHaveBeenCalledWith(
      'seller-1',
      'VENDOR',
      'promo-1',
      'PAUSED',
    );
  });

  it('activates and lists promocodes for the authenticated user', async () => {
    service.activate.mockResolvedValue({ id: 'activation-1' });
    service.listMyActivations.mockResolvedValue([{ id: 'activation-1' }]);

    await controller.activate(
      { user: { userId: 'user-1' } } as never,
      'promo-1',
    );
    await controller.listMyActivations({
      user: { userId: 'user-1' },
    } as never);

    expect(service.activate).toHaveBeenCalledWith('user-1', 'promo-1');
    expect(service.listMyActivations).toHaveBeenCalledWith('user-1');
  });
});
