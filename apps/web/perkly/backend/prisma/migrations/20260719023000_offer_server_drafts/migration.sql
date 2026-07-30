CREATE TABLE "OfferDraft" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfferDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferDraft_sellerId_key" ON "OfferDraft"("sellerId");
ALTER TABLE "OfferDraft" ADD CONSTRAINT "OfferDraft_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
