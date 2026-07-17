CREATE TABLE "DiagnosticIssue" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "appVersion" TEXT,
    "osVersion" TEXT,
    "deviceModel" TEXT,
    "userId" TEXT,
    "breadcrumbs" TEXT,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiagnosticIssue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiagnosticIssue_fingerprint_key" ON "DiagnosticIssue"("fingerprint");
CREATE INDEX "DiagnosticIssue_kind_lastSeenAt_idx" ON "DiagnosticIssue"("kind", "lastSeenAt");
CREATE INDEX "DiagnosticIssue_occurrences_lastSeenAt_idx" ON "DiagnosticIssue"("occurrences", "lastSeenAt");
