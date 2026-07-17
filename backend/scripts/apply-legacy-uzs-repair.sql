\set ON_ERROR_STOP on

BEGIN;

LOCK TABLE "User", "Deposit", "Offer", "Transaction" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Offer" WHERE "price" > 0 AND "price" < 1000) <> 17 THEN
    RAISE EXCEPTION 'Expected exactly 17 legacy offers';
  END IF;
  IF (SELECT COUNT(*) FROM "Transaction" WHERE "price" > 0 AND "price" < 1000) <> 53 THEN
    RAISE EXCEPTION 'Expected exactly 53 legacy transactions';
  END IF;
  IF (SELECT COUNT(*) FROM "Deposit" WHERE "amount" > 100000000) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one oversized test deposit';
  END IF;
  IF (
    SELECT COUNT(*) FROM "Deposit"
    WHERE "amount" > 0 AND "amount" < 1000 AND "status" = 'SUCCESS'
  ) <> 4 THEN
    RAISE EXCEPTION 'Expected exactly four successful legacy deposits';
  END IF;
  IF (
    SELECT COUNT(*) FROM "Deposit"
    WHERE "amount" < 1000 AND "status" <> 'SUCCESS'
  ) <> 4 THEN
    RAISE EXCEPTION 'Expected exactly four invalid pending/failed deposits';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LegacyMoneyRepairAudit" (
  "id" BIGSERIAL PRIMARY KEY,
  "tableName" TEXT NOT NULL,
  "rowId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "LegacyMoneyRepairAudit"
  ("tableName", "rowId", "field", "oldValue", "newValue", "reason")
SELECT
  'Offer',
  "id",
  'price',
  "price"::TEXT,
  ROUND("price" * 12000)::BIGINT::TEXT,
  'Normalize legacy USD-scale catalog price to whole UZS'
FROM "Offer"
WHERE "price" > 0 AND "price" < 1000;

UPDATE "Offer"
SET "price" = ROUND("price" * 12000)
WHERE "price" > 0 AND "price" < 1000;

INSERT INTO "LegacyMoneyRepairAudit"
  ("tableName", "rowId", "field", "oldValue", "newValue", "reason")
SELECT
  'Transaction',
  "id",
  'price',
  "price"::TEXT,
  ROUND("price" * 12000)::BIGINT::TEXT,
  'Normalize historical transaction display/accounting amount to whole UZS without replaying ambiguous legacy balance flows'
FROM "Transaction"
WHERE "price" > 0 AND "price" < 1000;

UPDATE "Transaction"
SET "price" = ROUND("price" * 12000)
WHERE "price" > 0 AND "price" < 1000;

INSERT INTO "LegacyMoneyRepairAudit"
  ("tableName", "rowId", "field", "oldValue", "newValue", "reason")
SELECT
  'Deposit',
  "id",
  'amount',
  "amount"::TEXT,
  ROUND("amount" * 12000)::BIGINT::TEXT,
  'Normalize successful legacy test top-up record to whole UZS; opening balance remains authoritative'
FROM "Deposit"
WHERE "amount" > 0
  AND "amount" < 1000
  AND "status" = 'SUCCESS';

UPDATE "Deposit"
SET "amount" = ROUND("amount" * 12000)
WHERE "amount" > 0
  AND "amount" < 1000
  AND "status" = 'SUCCESS';

INSERT INTO "LegacyMoneyRepairAudit"
  ("tableName", "rowId", "field", "oldValue", "newValue", "reason")
SELECT
  'User',
  "id",
  'balance',
  "balance"::TEXT,
  CASE
    WHEN "email" = 'nota@gmail.com' THEN ROUND(
      "balance" - COALESCE((
        SELECT SUM(d."amount")
        FROM "Deposit" d
        WHERE d."userId" = "User"."id"
          AND d."status" = 'SUCCESS'
          AND d."amount" > 100000000
      ), 0)
    )::BIGINT::TEXT
    WHEN "email" = 'system@perkly.app'
      THEN ROUND("balance" * 12000)::BIGINT::TEXT
    ELSE ROUND("balance")::BIGINT::TEXT
  END,
  'Establish explicit whole-UZS opening balance; remove oversized test credit and preserve current user purchasing power'
FROM "User"
WHERE "balance" < 0
   OR "balance" > 2000000000
   OR "balance" <> ROUND("balance");

UPDATE "User"
SET "balance" = CASE
  WHEN "email" = 'nota@gmail.com' THEN ROUND(
    "balance" - COALESCE((
      SELECT SUM(d."amount")
      FROM "Deposit" d
      WHERE d."userId" = "User"."id"
        AND d."status" = 'SUCCESS'
        AND d."amount" > 100000000
    ), 0)
  )
  WHEN "email" = 'system@perkly.app' THEN ROUND("balance" * 12000)
  ELSE ROUND("balance")
END
WHERE "balance" < 0
   OR "balance" > 2000000000
   OR "balance" <> ROUND("balance");

INSERT INTO "LegacyMoneyRepairAudit"
  ("tableName", "rowId", "field", "oldValue", "newValue", "reason")
SELECT
  'Deposit',
  "id",
  'row',
  json_build_object(
    'amount', "amount",
    'status', "status",
    'provider', "provider",
    'providerId', "providerId",
    'createdAt', "createdAt"
  )::TEXT,
  NULL,
  CASE
    WHEN "amount" > 100000000
      THEN 'Delete obvious oversized mock test deposit after removing its balance effect'
    ELSE 'Delete invalid pending/failed sub-minimum deposit'
  END
FROM "Deposit"
WHERE "amount" > 100000000
   OR ("amount" < 1000 AND "status" <> 'SUCCESS');

DELETE FROM "Deposit"
WHERE "amount" > 100000000
   OR ("amount" < 1000 AND "status" <> 'SUCCESS');

INSERT INTO "LegacyMoneyRepairAudit"
  ("tableName", "rowId", "field", "oldValue", "newValue", "reason")
SELECT
  'Offer',
  "id",
  'title',
  "title",
  'Steam: Пополнение баланса',
  'Remove dollar symbol from production catalog'
FROM "Offer"
WHERE "title" = 'Steam: Пополнение баланса 10$';

UPDATE "Offer"
SET "title" = 'Steam: Пополнение баланса'
WHERE "title" = 'Steam: Пополнение баланса 10$';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User"
    WHERE "balance" < 0
       OR "balance" > 2000000000
       OR "balance" <> ROUND("balance")
  ) THEN
    RAISE EXCEPTION 'Invalid User.balance remains after repair';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Deposit"
    WHERE "amount" < 1000
       OR "amount" > 100000000
       OR "amount" <> ROUND("amount")
  ) THEN
    RAISE EXCEPTION 'Invalid Deposit.amount remains after repair';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Offer"
    WHERE "price" < 0
       OR ("price" > 0 AND "price" < 1000)
       OR "price" > 100000000
       OR "price" <> ROUND("price")
  ) THEN
    RAISE EXCEPTION 'Invalid Offer.price remains after repair';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Transaction"
    WHERE "price" < 0
       OR ("price" > 0 AND "price" < 1000)
       OR "price" > 100000000
       OR "price" <> ROUND("price")
  ) THEN
    RAISE EXCEPTION 'Invalid Transaction.price remains after repair';
  END IF;
END $$;

COMMIT;
