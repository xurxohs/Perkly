import { Test, TestingModule } from '@nestjs/testing';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OffersController', () => {
  let controller: OffersController;
  let offersService: {
    findAllFiltered: jest.Mock;
    findRelatedOffers: jest.Mock;
  };

  beforeEach(async () => {
    offersService = {
      findAllFiltered: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      findRelatedOffers: jest.fn().mockResolvedValue({ data: [], total: 0 }),
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

  it('ignores invalid related offers take values', async () => {
    await controller.findRelated('offer-1', 'NaN');

    expect(offersService.findRelatedOffers).toHaveBeenCalledWith(
      'offer-1',
      undefined,
    );
  });
});
