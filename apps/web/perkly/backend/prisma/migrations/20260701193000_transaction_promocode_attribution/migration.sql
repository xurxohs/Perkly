ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "promocodeActivationId" TEXT,
ADD COLUMN IF NOT EXISTS "promocodeDiscount" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "promocodeCodeSnapshot" TEXT;

CREATE INDEX IF NOT EXISTS "Transaction_promocodeActivationId_idx" ON "Transaction"("promocodeActivationId");
