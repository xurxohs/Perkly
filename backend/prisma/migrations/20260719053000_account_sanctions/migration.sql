ALTER TABLE "User"
ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "suspensionReason" TEXT,
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspendedUntil" TIMESTAMP(3),
ADD COLUMN "suspendedBy" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_accountStatus_check"
CHECK ("accountStatus" IN ('ACTIVE', 'SUSPENDED'));

CREATE INDEX "User_accountStatus_suspendedUntil_idx"
ON "User"("accountStatus", "suspendedUntil");
