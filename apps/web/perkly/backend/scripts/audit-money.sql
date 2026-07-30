\pset pager off

SELECT
  'User.balance' AS field,
  COUNT(*) AS rows,
  COUNT(*) FILTER (
    WHERE "balance" < 0
       OR "balance" > 2000000000
       OR "balance" <> ROUND("balance")
  ) AS invalid_rows,
  MIN("balance") AS minimum,
  MAX("balance") AS maximum
FROM "User"
UNION ALL
SELECT
  'Deposit.amount',
  COUNT(*),
  COUNT(*) FILTER (
    WHERE "amount" < 1000
       OR "amount" > 100000000
       OR "amount" <> ROUND("amount")
  ),
  MIN("amount"),
  MAX("amount")
FROM "Deposit"
UNION ALL
SELECT
  'Offer.price',
  COUNT(*),
  COUNT(*) FILTER (
    WHERE "price" < 0
       OR ("price" > 0 AND "price" < 1000)
       OR "price" > 100000000
       OR "price" <> ROUND("price")
  ),
  MIN("price"),
  MAX("price")
FROM "Offer"
UNION ALL
SELECT
  'Transaction.price',
  COUNT(*),
  COUNT(*) FILTER (
    WHERE "price" < 0
       OR ("price" > 0 AND "price" < 1000)
       OR "price" > 100000000
       OR "price" <> ROUND("price")
  ),
  MIN("price"),
  MAX("price")
FROM "Transaction";

SELECT "email", "balance"
FROM "User"
WHERE "balance" < 0
   OR "balance" > 2000000000
   OR "balance" <> ROUND("balance")
ORDER BY ABS("balance") DESC;

SELECT "id", "title", "price"
FROM "Offer"
WHERE "price" < 0
   OR ("price" > 0 AND "price" < 1000)
   OR "price" > 100000000
   OR "price" <> ROUND("price")
ORDER BY "price", "title";

SELECT "id", "userId", "amount", "status", "provider", "createdAt"
FROM "Deposit"
WHERE "amount" < 1000
   OR "amount" > 100000000
   OR "amount" <> ROUND("amount")
ORDER BY ABS("amount") DESC;
