CREATE TABLE "ModerationReport" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolution" TEXT,
  "resolvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModerationReport_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ModerationAppeal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolution" TEXT,
  "resolvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModerationAppeal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ModerationReport_reporterId_createdAt_idx" ON "ModerationReport"("reporterId", "createdAt");
CREATE INDEX "ModerationReport_status_createdAt_idx" ON "ModerationReport"("status", "createdAt");
CREATE INDEX "ModerationReport_targetType_targetId_idx" ON "ModerationReport"("targetType", "targetId");
CREATE INDEX "ModerationAppeal_userId_createdAt_idx" ON "ModerationAppeal"("userId", "createdAt");
CREATE INDEX "ModerationAppeal_status_createdAt_idx" ON "ModerationAppeal"("status", "createdAt");
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAppeal" ADD CONSTRAINT "ModerationAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
