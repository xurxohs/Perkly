ALTER TABLE "Offer"
ADD COLUMN "deliveryEstimateMinutes" INTEGER,
ADD COLUMN "warrantyDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "stockQuantity" INTEGER,
ADD COLUMN "buyerInputPrompt" TEXT,
ADD COLUMN "buyerInputRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sourceUrl" TEXT;

CREATE INDEX "Offer_isDemo_isActive_idx" ON "Offer"("isDemo", "isActive");
