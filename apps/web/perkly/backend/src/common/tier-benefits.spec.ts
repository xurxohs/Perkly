import {
  ANNUAL_SUBSCRIPTION_DISCOUNT_PERCENT,
  cashbackPercentForTier,
  cashbackPointsForPurchase,
  dailyWheelLimitForTier,
  subscriptionCost,
} from './tier-benefits';

describe('tier benefits', () => {
  it('keeps cashback aligned with the published 1/3/5 percent tiers', () => {
    expect(cashbackPercentForTier('SILVER')).toBe(1);
    expect(cashbackPercentForTier('GOLD')).toBe(3);
    expect(cashbackPercentForTier('PLATINUM')).toBe(5);
    expect(cashbackPointsForPurchase(120_000, 'SILVER')).toBe(10);
    expect(cashbackPointsForPurchase(120_000, 'GOLD')).toBe(30);
    expect(cashbackPointsForPurchase(120_000, 'PLATINUM')).toBe(50);
  });

  it('keeps daily wheel limits aligned with the published tiers', () => {
    expect(dailyWheelLimitForTier('SILVER')).toBe(1);
    expect(dailyWheelLimitForTier('GOLD')).toBe(3);
    expect(dailyWheelLimitForTier('PLATINUM')).toBe(5);
    expect(dailyWheelLimitForTier('UNKNOWN')).toBe(1);
  });

  it('applies the annual discount only to a twelve-month purchase', () => {
    expect(ANNUAL_SUBSCRIPTION_DISCOUNT_PERCENT).toBe(20);
    expect(subscriptionCost(59_880, 1)).toBe(59_880);
    expect(subscriptionCost(59_880, 11)).toBe(658_680);
    expect(subscriptionCost(59_880, 12)).toBe(574_848);
  });
});
