ALTER TABLE "Offer" ADD COLUMN "imageUrl" TEXT;

-- Preserve existing product artwork. Brand assets remain in vendorLogo and can
-- be replaced independently as sellers upload dedicated product photography.
UPDATE "Offer"
SET "imageUrl" = "vendorLogo"
WHERE "imageUrl" IS NULL
  AND "vendorLogo" IS NOT NULL
  AND "vendorLogo" NOT LIKE '/brands/%';
