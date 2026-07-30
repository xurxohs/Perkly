-- This migration intentionally performs no conversion.
-- It prevents the following INTEGER migration from silently rounding mixed
-- legacy USD/UZS values or overflowing PostgreSQL INT4.
DO $$
DECLARE
  issue_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO issue_count
  FROM "User"
  WHERE "balance" < 0
     OR "balance" > 2000000000
     OR "balance" <> ROUND("balance");
  IF issue_count > 0 THEN
    RAISE EXCEPTION
      'UZS preflight failed: % User.balance values are fractional, negative, or above 2,000,000,000. Run the money audit and repair them explicitly.',
      issue_count;
  END IF;

  SELECT COUNT(*) INTO issue_count
  FROM "Deposit"
  WHERE "amount" < 1000
     OR "amount" > 100000000
     OR "amount" <> ROUND("amount");
  IF issue_count > 0 THEN
    RAISE EXCEPTION
      'UZS preflight failed: % Deposit.amount values are fractional or outside 1,000..100,000,000.',
      issue_count;
  END IF;

  SELECT COUNT(*) INTO issue_count
  FROM "Offer"
  WHERE "price" < 0
     OR ("price" > 0 AND "price" < 1000)
     OR "price" > 100000000
     OR "price" <> ROUND("price");
  IF issue_count > 0 THEN
    RAISE EXCEPTION
      'UZS preflight failed: % Offer.price values are fractional or outside 0/free or 1,000..100,000,000. Legacy dollar-scale prices must be repaired explicitly.',
      issue_count;
  END IF;

  SELECT COUNT(*) INTO issue_count
  FROM "Transaction"
  WHERE "price" < 0
     OR ("price" > 0 AND "price" < 1000)
     OR "price" > 100000000
     OR "price" <> ROUND("price")
     OR (
       "promocodeDiscount" IS NOT NULL
       AND (
         "promocodeDiscount" < 0
         OR "promocodeDiscount" > 100000000
         OR "promocodeDiscount" <> ROUND("promocodeDiscount")
       )
     );
  IF issue_count > 0 THEN
    RAISE EXCEPTION
      'UZS preflight failed: % Transaction monetary values contain legacy dollar-scale prices or are outside UZS limits.',
      issue_count;
  END IF;
END $$;
