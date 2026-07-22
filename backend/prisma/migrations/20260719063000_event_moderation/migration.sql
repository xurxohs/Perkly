ALTER TABLE "Event"
ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "moderationNote" TEXT,
ADD COLUMN "moderationAt" TIMESTAMP(3),
ADD COLUMN "moderationBy" TEXT,
ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "Event"
SET "publishedAt" = "createdAt",
    "moderationAt" = "createdAt"
WHERE "moderationStatus" = 'APPROVED';

ALTER TABLE "Event" ALTER COLUMN "moderationStatus" SET DEFAULT 'PENDING';

CREATE INDEX "Event_moderationStatus_createdAt_idx"
ON "Event"("moderationStatus", "createdAt");
