INSERT INTO "FinancialEntry" (
  "id",
  "userId",
  "type",
  "amount",
  "balanceAfter",
  "currency",
  "idempotencyKey",
  "metadata"
)
SELECT
  gen_random_uuid()::TEXT,
  "id",
  'OPENING_BALANCE',
  "balance",
  "balance",
  'UZS',
  'opening-balance:' || "id",
  '{"source":"legacy_uzs_migration"}'
FROM "User"
WHERE "balance" <> 0
ON CONFLICT ("idempotencyKey") DO NOTHING;
