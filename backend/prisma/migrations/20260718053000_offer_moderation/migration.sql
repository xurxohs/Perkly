-- Existing offers remain visible after rollout. Every newly created vendor
-- offer is explicitly moved to PENDING by the application service.
ALTER TABLE "Offer"
ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "moderationNote" TEXT,
ADD COLUMN "moderationAt" TIMESTAMP(3),
ADD COLUMN "moderationBy" TEXT;

ALTER TABLE "Offer"
ADD CONSTRAINT "Offer_moderationStatus_check"
CHECK ("moderationStatus" IN ('PENDING', 'APPROVED', 'REJECTED'));

CREATE INDEX "Offer_moderationStatus_isActive_idx"
ON "Offer"("moderationStatus", "isActive");
