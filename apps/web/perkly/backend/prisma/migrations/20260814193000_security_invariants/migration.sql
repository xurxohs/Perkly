ALTER TABLE "Transaction"
ADD COLUMN "rewardPointsAwarded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rewardPointsSpent" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "AnalyticsEvent" ADD COLUMN "dedupeKey" TEXT;
CREATE UNIQUE INDEX "AnalyticsEvent_dedupeKey_key" ON "AnalyticsEvent"("dedupeKey");

DELETE FROM "Review" duplicate
USING "Review" retained
WHERE duplicate."authorId" = retained."authorId"
  AND duplicate."offerId" = retained."offerId"
  AND (
    duplicate."createdAt" > retained."createdAt"
    OR (duplicate."createdAt" = retained."createdAt" AND duplicate."id" > retained."id")
  );
CREATE UNIQUE INDEX "Review_authorId_offerId_key" ON "Review"("authorId", "offerId");

CREATE TABLE "ConsumedAuthAssertion" (
  "digest" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsumedAuthAssertion_pkey" PRIMARY KEY ("digest")
);
CREATE INDEX "ConsumedAuthAssertion_expiresAt_idx" ON "ConsumedAuthAssertion"("expiresAt");
