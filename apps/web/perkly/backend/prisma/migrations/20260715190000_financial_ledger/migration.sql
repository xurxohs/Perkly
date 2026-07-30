-- UZS is stored as whole sums. Existing fractional values are rounded once.
ALTER TABLE "User" ALTER COLUMN "balance" TYPE INTEGER USING ROUND("balance")::INTEGER;
ALTER TABLE "User" ALTER COLUMN "balance" SET DEFAULT 0;
ALTER TABLE "Squad" ALTER COLUMN "monthlyGoal" TYPE INTEGER USING ROUND("monthlyGoal")::INTEGER;
ALTER TABLE "Squad" ALTER COLUMN "monthlyGoal" SET DEFAULT 1000000;
ALTER TABLE "Deposit" ALTER COLUMN "amount" TYPE INTEGER USING ROUND("amount")::INTEGER;
ALTER TABLE "Deposit" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Deposit_idempotencyKey_key" ON "Deposit"("idempotencyKey");
ALTER TABLE "Offer" ALTER COLUMN "price" TYPE INTEGER USING ROUND("price")::INTEGER;
ALTER TABLE "Offer" ALTER COLUMN "price" SET DEFAULT 0;
ALTER TABLE "Transaction" ALTER COLUMN "price" TYPE INTEGER USING ROUND("price")::INTEGER;
ALTER TABLE "Transaction" ALTER COLUMN "promocodeDiscount" TYPE INTEGER USING ROUND("promocodeDiscount")::INTEGER;
ALTER TABLE "Transaction" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");

CREATE TABLE "FinancialEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "transactionId" TEXT,
  "depositId" TEXT,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "idempotencyKey" TEXT NOT NULL,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FinancialEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FinancialEntry_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "Deposit"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FinancialEntry_idempotencyKey_key" ON "FinancialEntry"("idempotencyKey");
CREATE INDEX "FinancialEntry_userId_createdAt_idx" ON "FinancialEntry"("userId", "createdAt");
CREATE INDEX "FinancialEntry_transactionId_idx" ON "FinancialEntry"("transactionId");
CREATE INDEX "FinancialEntry_depositId_idx" ON "FinancialEntry"("depositId");
CREATE INDEX "FinancialEntry_type_createdAt_idx" ON "FinancialEntry"("type", "createdAt");

CREATE INDEX "AdminLog_adminId_createdAt_idx" ON "AdminLog"("adminId", "createdAt");
CREATE INDEX "AdminLog_action_createdAt_idx" ON "AdminLog"("action", "createdAt");
CREATE OR REPLACE FUNCTION prevent_admin_log_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AdminLog is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "AdminLog_append_only"
BEFORE UPDATE OR DELETE ON "AdminLog"
FOR EACH ROW EXECUTE FUNCTION prevent_admin_log_mutation();
