import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

describe('CompaniesController', () => {
  let service: {
    getMyCompany: jest.Mock;
    apply: jest.Mock;
    list: jest.Mock;
    updateStatus: jest.Mock;
  };
  let controller: CompaniesController;

  beforeEach(() => {
    service = {
      getMyCompany: jest.fn(),
      apply: jest.fn(),
      list: jest.fn(),
      updateStatus: jest.fn(),
    };
    controller = new CompaniesController(service as unknown as CompaniesService);
  });

  it('loads the current user company', async () => {
    service.getMyCompany.mockResolvedValue({ id: 'company-1' });

    await controller.getMine({
      user: { userId: 'user-1' },
    } as never);

    expect(service.getMyCompany).toHaveBeenCalledWith('user-1');
  });

  it('creates an application for the current user', async () => {
    const body = {
      legalName: 'Perkly LLC',
      brandName: 'Perkly',
      inn: '123456789',
    };
    service.apply.mockResolvedValue({ id: 'company-1' });

    await controller.apply(
      {
        user: { userId: 'user-1' },
      } as never,
      body,
    );

    expect(service.apply).toHaveBeenCalledWith('user-1', body);
  });

  it('passes admin status filters to the service', async () => {
    service.list.mockResolvedValue([]);

    await controller.list('PENDING_MODERATION');

    expect(service.list).toHaveBeenCalledWith('PENDING_MODERATION');
  });

  it('passes moderation status updates to the service', async () => {
    service.updateStatus.mockResolvedValue({ id: 'company-1' });

    await controller.updateStatus('company-1', 'ACTIVE');

    expect(service.updateStatus).toHaveBeenCalledWith('company-1', 'ACTIVE');
  });
});
