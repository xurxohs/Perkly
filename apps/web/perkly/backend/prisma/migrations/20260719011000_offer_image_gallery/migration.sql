ALTER TABLE "Offer" ADD COLUMN "images" JSONB;

UPDATE "Offer"
SET "images" = jsonb_build_array("imageUrl")
WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';
