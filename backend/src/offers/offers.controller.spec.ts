import { Test, TestingModule } from '@nestjs/testing';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OffersController', () => {
  let controller: OffersController;
  let offersService: {
    findAllFiltered: jest.Mock;
    findRelatedOffers: jest.Mock;
    saveOffer: jest.Mock;
    unsaveOffer: jest.Mock;
    findRaw: jest.Mock;
    update: jest.Mock;
    createVendorOffer: jest.Mock;
  };

  beforeEach(async () => {
    offersService = {
      findAllFiltered: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      findRelatedOffers: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      saveOffer: jest.fn().mockResolvedValue({ id: 'saved-1' }),
      unsaveOffer: jest.fn().mockResolvedValue({ deleted: true }),
      findRaw: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'offer-1' }),
      createVendorOffer: jest.fn().mockResolvedValue({ id: 'offer-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OffersController],
      providers: [
        { provide: OffersService, useValue: offersService },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<OffersController>(OffersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('clamps take and negative skip for offer lists', async () => {
    await controller.findAll('-10', '100000');

    expect(offersService.findAllFiltered).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
      }),
    );
  });

  it('uses defaults and omits NaN query numbers for offer lists', async () => {
    await controller.findAll(
      'NaN',
      'bad',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'nope',
      'NaN',
      'bad-lat',
      '69.25',
      '1000',
    );

    const params = offersService.findAllFiltered.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(params.skip).toBe(0);
    expect(params.take).toBe(20);
    expect(params.minPrice).toBeUndefined();
    expect(params.maxPrice).toBeUndefined();
    expect(params.lat).toBeUndefined();
    expect(params.lng).toBeUndefined();
    expect(params.radiusKm).toBeUndefined();
  });

  it('limits offer geo radius to 100 km', async () => {
    await controller.findAll(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      '41.31',
      '69.27',
      '500',
    );

    expect(offersService.findAllFiltered).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: 41.31,
        lng: 69.27,
        radiusKm: 100,
      }),
    );
  });

  it('normalizes fulfillment filters used by the catalog drawer', async () => {
    await controller.findAll(
      undefined,
      undefined,
      undefined,
      'digital_code',
    );

    expect(offersService.findAllFiltered).toHaveBeenCalledWith(
      expect.objectContaining({ fulfillmentType: 'DIGITAL_CODE' }),
    );
  });

  it('ignores invalid related offers take values', async () => {
    await controller.findRelated('offer-1', 'NaN');

    expect(offersService.findRelatedOffers).toHaveBeenCalledWith(
      'offer-1',
      undefined,
    );
  });

  it('saves and unsaves offers for the authenticated user', async () => {
    const req = { user: { userId: 'user-1' } } as never;

    await controller.saveOffer(req, 'offer-1');
    await controller.unsaveOffer(req, 'offer-1');

    expect(offersService.saveOffer).toHaveBeenCalledWith('user-1', 'offer-1');
    expect(offersService.unsaveOffer).toHaveBeenCalledWith('user-1', 'offer-1');
  });

  it('drops protected relation fields from offer updates', async () => {
    await controller.update(
      'offer-1',
      { user: { userId: 'admin-1', role: 'ADMIN' } } as never,
      {
        title: 'Updated title',
        sellerId: 'attacker-selected-seller',
        companyId: 'attacker-selected-company',
        featuredUntil: '2099-01-01T00:00:00.000Z',
      },
    );

    expect(offersService.update).toHaveBeenCalledWith({
      where: { id: 'offer-1' },
      data: { title: 'Updated title' },
    });
  });

  it('normalizes vendor categories to the public catalog format', async () => {
    await controller.createVendorOffer(
      { user: { userId: 'vendor-1', role: 'VENDOR' } } as never,
      {
        title: 'Кофе',
        description: 'Промокод на кофе',
        category: 'restaurants',
        hiddenData: 'COFFEE50',
        price: 50_000,
      },
    );

    expect(offersService.createVendorOffer).toHaveBeenCalledWith(
      'vendor-1',
      expect.objectContaining({ category: 'RESTAURANTS' }),
      'VENDOR',
    );
  });

  it('normalizes categories when a vendor edits an offer', async () => {
    offersService.findRaw.mockResolvedValue({
      id: 'offer-1',
      sellerId: 'vendor-1',
    });

    await controller.update(
      'offer-1',
      { user: { userId: 'vendor-1', role: 'VENDOR' } } as never,
      { category: 'marketplaces' },
    );

    expect(offersService.update).toHaveBeenCalledWith({
      where: { id: 'offer-1' },
      data: { category: 'MARKETPLACES' },
    });
  });
});
