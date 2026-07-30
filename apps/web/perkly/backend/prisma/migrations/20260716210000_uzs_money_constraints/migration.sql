ALTER TABLE "User"
  ADD CONSTRAINT "User_balance_whole_uzs_check"
  CHECK ("balance" >= 0 AND "balance" <= 2000000000);

ALTER TABLE "Deposit"
  ADD CONSTRAINT "Deposit_amount_whole_uzs_check"
  CHECK ("amount" >= 1000 AND "amount" <= 100000000);

ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_price_whole_uzs_check"
  CHECK (
    "price" = 0
    OR ("price" >= 1000 AND "price" <= 100000000)
  );

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_price_whole_uzs_check"
  CHECK (
    "price" = 0
    OR ("price" >= 1000 AND "price" <= 100000000)
  ),
  ADD CONSTRAINT "Transaction_promocode_discount_whole_uzs_check"
  CHECK (
    "promocodeDiscount" IS NULL
    OR (
      "promocodeDiscount" >= 0
      AND "promocodeDiscount" <= 100000000
    )
  );

ALTER TABLE "FinancialEntry"
  ADD CONSTRAINT "FinancialEntry_amount_whole_uzs_check"
  CHECK ("amount" >= -2000000000 AND "amount" <= 2000000000),
  ADD CONSTRAINT "FinancialEntry_balance_after_whole_uzs_check"
  CHECK ("balanceAfter" >= 0 AND "balanceAfter" <= 2000000000),
  ADD CONSTRAINT "FinancialEntry_currency_uzs_check"
  CHECK ("currency" = 'UZS');
