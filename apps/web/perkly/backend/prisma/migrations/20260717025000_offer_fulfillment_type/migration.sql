ALTER TABLE "Offer"
ADD COLUMN "fulfillmentType" TEXT NOT NULL DEFAULT 'DIGITAL_CODE';

-- Existing offers historically contained digital access data. New offers
-- should be ordinary purchases unless the seller explicitly enables codes.
ALTER TABLE "Offer"
ALTER COLUMN "fulfillmentType" SET DEFAULT 'INSTRUCTIONS';

ALTER TABLE "Offer"
ADD CONSTRAINT "Offer_fulfillmentType_check"
CHECK ("fulfillmentType" IN ('PROMOCODE', 'DIGITAL_CODE', 'LINK', 'INSTRUCTIONS'));
