import {
  isValidOfferPriceUzs,
  isWholeUzsAmount,
  MAX_OFFER_PRICE_UZS,
  MAX_WALLET_BALANCE_UZS,
  platformFee,
  REWARD_POINT_VALUE_UZS,
  sellerPayout,
} from './money';

describe('UZS money rules', () => {
  it('accepts only whole amounts inside the requested range', () => {
    expect(isWholeUzsAmount(0, { min: 0, max: 100 })).toBe(true);
    expect(isWholeUzsAmount(100, { min: 0, max: 100 })).toBe(true);
    expect(isWholeUzsAmount(0.5, { min: 0, max: 100 })).toBe(false);
    expect(isWholeUzsAmount(-1, { min: 0, max: 100 })).toBe(false);
    expect(isWholeUzsAmount(101, { min: 0, max: 100 })).toBe(false);
    expect(isWholeUzsAmount('100', { min: 0, max: 100 })).toBe(false);
  });

  it('keeps configured amounts inside PostgreSQL INT limits', () => {
    expect(MAX_OFFER_PRICE_UZS).toBeLessThanOrEqual(2_147_483_647);
    expect(MAX_WALLET_BALANCE_UZS).toBeLessThanOrEqual(2_147_483_647);
  });

  it('allows free offers but rejects legacy dollar-scale paid prices', () => {
    expect(isValidOfferPriceUzs(0)).toBe(true);
    expect(isValidOfferPriceUzs(999)).toBe(false);
    expect(isValidOfferPriceUzs(1_000)).toBe(true);
    expect(isValidOfferPriceUzs(59_880)).toBe(true);
  });

  it('splits a whole UZS amount without losing a sum', () => {
    const amount = 118_801;
    expect(sellerPayout(amount)).toBe(112_861);
    expect(platformFee(amount)).toBe(5_940);
    expect(sellerPayout(amount) + platformFee(amount)).toBe(amount);
  });

  it('uses one explicit UZS value for reward points', () => {
    expect(REWARD_POINT_VALUE_UZS).toBe(120);
    expect(100 * REWARD_POINT_VALUE_UZS).toBe(12_000);
  });

  it('rejects fractional and oversized payout inputs', () => {
    expect(() => sellerPayout(0.5)).toThrow(RangeError);
    expect(() => sellerPayout(MAX_WALLET_BALANCE_UZS + 1)).toThrow(RangeError);
  });
});
