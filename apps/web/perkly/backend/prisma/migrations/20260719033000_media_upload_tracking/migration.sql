CREATE TABLE "MediaUpload" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaUpload_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaUpload_url_key" ON "MediaUpload"("url");
CREATE INDEX "MediaUpload_claimedAt_createdAt_idx" ON "MediaUpload"("claimedAt", "createdAt");
CREATE INDEX "MediaUpload_ownerId_idx" ON "MediaUpload"("ownerId");
ALTER TABLE "MediaUpload" ADD CONSTRAINT "MediaUpload_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
