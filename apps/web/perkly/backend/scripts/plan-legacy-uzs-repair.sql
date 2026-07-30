\pset pager off

-- Historical demo prices were authored in USD-scale values and the current
-- UZS catalog was seeded using 12,000 UZS per legacy unit. This script is a
-- read-only preview. It intentionally performs no UPDATE or DELETE.
\set legacy_rate 12000

SELECT
  "id",
  "title",
  "price" AS current_price,
  ROUND("price" * :legacy_rate)::BIGINT AS proposed_uzs_price
FROM "Offer"
WHERE "price" > 0
  AND "price" < 1000
ORDER BY "price", "title";

SELECT
  t."id",
  o."title",
  t."status",
  t."price" AS current_price,
  ROUND(t."price" * :legacy_rate)::BIGINT AS proposed_uzs_price,
  t."createdAt"
FROM "Transaction" t
JOIN "Offer" o ON o."id" = t."offerId"
WHERE t."price" > 0
  AND t."price" < 1000
ORDER BY t."createdAt", t."id";

SELECT
  d."id",
  u."email",
  d."amount",
  d."status",
  d."provider",
  d."createdAt",
  CASE
    WHEN d."amount" > 100000000 THEN 'QUARANTINE_OVERSIZED_TEST_DEPOSIT'
    WHEN d."amount" < 1000 THEN 'REVIEW_LEGACY_OR_INVALID_DEPOSIT'
    ELSE 'KEEP'
  END AS proposed_action
FROM "Deposit" d
JOIN "User" u ON u."id" = d."userId"
WHERE d."amount" < 1000
   OR d."amount" > 100000000
ORDER BY ABS(d."amount") DESC;

SELECT
  "id",
  "email",
  "balance",
  CASE
    WHEN "balance" > 2000000000 THEN 'RECONSTRUCT_AFTER_TEST_DEPOSIT_REMOVAL'
    WHEN "balance" <> ROUND("balance") THEN 'RECONSTRUCT_FROM_NORMALIZED_FLOWS'
    WHEN "balance" < 0 THEN 'MANUAL_REVIEW_NEGATIVE_BALANCE'
    ELSE 'KEEP'
  END AS proposed_action
FROM "User"
WHERE "balance" < 0
   OR "balance" > 2000000000
   OR "balance" <> ROUND("balance")
ORDER BY ABS("balance") DESC;
