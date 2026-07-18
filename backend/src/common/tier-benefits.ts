import { REWARD_POINT_VALUE_UZS } from './money';

export type AccountTier = 'SILVER' | 'GOLD' | 'PLATINUM';

export const ANNUAL_SUBSCRIPTION_DISCOUNT_PERCENT = 20;

const CASHBACK_PERCENT: Record<AccountTier, number> = {
  SILVER: 1,
  GOLD: 3,
  PLATINUM: 5,
};

const DAILY_WHEEL_LIMIT: Record<AccountTier, number> = {
  SILVER: 1,
  GOLD: 3,
  PLATINUM: 5,
};

function normalizeTier(tier: string | null | undefined): AccountTier {
  return tier === 'GOLD' || tier === 'PLATINUM' ? tier : 'SILVER';
}

export function cashbackPercentForTier(tier: string | null | undefined) {
  return CASHBACK_PERCENT[normalizeTier(tier)];
}

export function cashbackPointsForPurchase(
  amountUzs: number,
  tier: string | null | undefined,
) {
  if (!Number.isSafeInteger(amountUzs) || amountUzs < 0) {
    throw new RangeError('amountUzs must be a non-negative whole UZS value');
  }

  return Math.floor(
    (amountUzs * cashbackPercentForTier(tier)) /
      (100 * REWARD_POINT_VALUE_UZS),
  );
}

export function dailyWheelLimitForTier(tier: string | null | undefined) {
  return DAILY_WHEEL_LIMIT[normalizeTier(tier)];
}

export function subscriptionCost(
  monthlyPriceUzs: number,
  months: number,
) {
  if (!Number.isSafeInteger(monthlyPriceUzs) || monthlyPriceUzs < 0) {
    throw new RangeError('monthlyPriceUzs must be a non-negative whole UZS value');
  }
  if (!Number.isInteger(months) || months < 1 || months > 12) {
    throw new RangeError('months must be an integer between 1 and 12');
  }

  const subtotal = monthlyPriceUzs * months;
  return months === 12
    ? Math.round(
        (subtotal * (100 - ANNUAL_SUBSCRIPTION_DISCOUNT_PERCENT)) / 100,
      )
    : subtotal;
}
