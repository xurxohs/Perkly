export const PLATFORM_FEE_PERCENT = 5;
export const MIN_TOP_UP_UZS = 1_000;
export const MAX_TOP_UP_UZS = 100_000_000;
export const MIN_PAID_OFFER_PRICE_UZS = 1_000;
export const MAX_OFFER_PRICE_UZS = 100_000_000;
export const MAX_WALLET_BALANCE_UZS = 2_000_000_000;
export const REWARD_POINT_VALUE_UZS = 120;

export function isWholeUzsAmount(
  value: unknown,
  options: { min?: number; max?: number } = {},
): value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return false;
  if (options.min !== undefined && value < options.min) return false;
  if (options.max !== undefined && value > options.max) return false;
  return true;
}

export function isValidOfferPriceUzs(value: unknown): value is number {
  return (
    value === 0 ||
    isWholeUzsAmount(value, {
      min: MIN_PAID_OFFER_PRICE_UZS,
      max: MAX_OFFER_PRICE_UZS,
    })
  );
}

export function sellerPayout(amount: number): number {
  if (!isWholeUzsAmount(amount, { min: 0, max: MAX_WALLET_BALANCE_UZS })) {
    throw new RangeError(
      'amount must be a whole UZS value within wallet limits',
    );
  }
  return Math.round((amount * (100 - PLATFORM_FEE_PERCENT)) / 100);
}

export function platformFee(amount: number): number {
  return amount - sellerPayout(amount);
}
