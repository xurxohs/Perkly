ALTER TABLE "Promocode"
ADD COLUMN IF NOT EXISTS "maxActivations" INTEGER,
ADD COLUMN IF NOT EXISTS "perUserLimit" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "Promocode_maxActivations_idx" ON "Promocode"("maxActivations");
