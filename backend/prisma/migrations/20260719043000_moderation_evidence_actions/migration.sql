ALTER TABLE "ModerationReport"
ADD COLUMN "evidence" JSONB,
ADD COLUMN "targetSnapshot" JSONB,
ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "actionTaken" TEXT;

CREATE INDEX "ModerationReport_status_priority_createdAt_idx"
ON "ModerationReport"("status", "priority", "createdAt");
