ALTER TABLE "Dispute"
  ADD COLUMN "resolution" TEXT,
  ADD COLUMN "adminNote" TEXT,
  ADD COLUMN "resolvedBy" TEXT,
  ADD COLUMN "resolvedAt" TIMESTAMP(3);

CREATE INDEX "Dispute_status_createdAt_idx"
  ON "Dispute"("status", "createdAt");

CREATE INDEX "Dispute_resolvedBy_resolvedAt_idx"
  ON "Dispute"("resolvedBy", "resolvedAt");
