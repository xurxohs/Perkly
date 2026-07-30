-- B2B/B2C foundation for the ТЗ role model.
-- This migration is additive and uses IF NOT EXISTS where PostgreSQL supports it,
-- so it can be applied on the server without dropping current marketplace data.

CREATE TABLE IF NOT EXISTS "B2CProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "birthYear" INTEGER,
    "gender" TEXT,
    "city" TEXT,
    "anonymousId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2CProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "B2CProfile_userId_key" ON "B2CProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "B2CProfile_anonymousId_key" ON "B2CProfile"("anonymousId");
CREATE INDEX IF NOT EXISTS "B2CProfile_city_idx" ON "B2CProfile"("city");
CREATE INDEX IF NOT EXISTS "B2CProfile_anonymousId_idx" ON "B2CProfile"("anonymousId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'B2CProfile_userId_fkey'
    ) THEN
        ALTER TABLE "B2CProfile"
        ADD CONSTRAINT "B2CProfile_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "inn" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_MODERATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Company_ownerUserId_key" ON "Company"("ownerUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "Company_inn_key" ON "Company"("inn");
CREATE INDEX IF NOT EXISTS "Company_ownerUserId_idx" ON "Company"("ownerUserId");
CREATE INDEX IF NOT EXISTS "Company_status_idx" ON "Company"("status");
CREATE INDEX IF NOT EXISTS "Company_brandName_idx" ON "Company"("brandName");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Company_ownerUserId_fkey'
    ) THEN
        ALTER TABLE "Company"
        ADD CONSTRAINT "Company_ownerUserId_fkey"
        FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "Offer_companyId_isActive_idx" ON "Offer"("companyId", "isActive");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Offer_companyId_fkey'
    ) THEN
        ALTER TABLE "Offer"
        ADD CONSTRAINT "Offer_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Promocode" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "offerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "codeType" TEXT NOT NULL DEFAULT 'STATIC',
    "code" TEXT,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Promocode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Promocode_companyId_status_idx" ON "Promocode"("companyId", "status");
CREATE INDEX IF NOT EXISTS "Promocode_offerId_idx" ON "Promocode"("offerId");
CREATE INDEX IF NOT EXISTS "Promocode_codeType_idx" ON "Promocode"("codeType");
CREATE INDEX IF NOT EXISTS "Promocode_validTo_idx" ON "Promocode"("validTo");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Promocode_companyId_fkey'
    ) THEN
        ALTER TABLE "Promocode"
        ADD CONSTRAINT "Promocode_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Promocode_offerId_fkey'
    ) THEN
        ALTER TABLE "Promocode"
        ADD CONSTRAINT "Promocode_offerId_fkey"
        FOREIGN KEY ("offerId") REFERENCES "Offer"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PromocodeActivation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promocodeId" TEXT NOT NULL,
    "offerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "codeSnapshot" TEXT,
    "copiedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromocodeActivation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PromocodeActivation_userId_status_createdAt_idx" ON "PromocodeActivation"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "PromocodeActivation_promocodeId_status_idx" ON "PromocodeActivation"("promocodeId", "status");
CREATE INDEX IF NOT EXISTS "PromocodeActivation_offerId_idx" ON "PromocodeActivation"("offerId");
CREATE INDEX IF NOT EXISTS "PromocodeActivation_createdAt_idx" ON "PromocodeActivation"("createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PromocodeActivation_userId_fkey'
    ) THEN
        ALTER TABLE "PromocodeActivation"
        ADD CONSTRAINT "PromocodeActivation_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PromocodeActivation_promocodeId_fkey'
    ) THEN
        ALTER TABLE "PromocodeActivation"
        ADD CONSTRAINT "PromocodeActivation_promocodeId_fkey"
        FOREIGN KEY ("promocodeId") REFERENCES "Promocode"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PromocodeActivation_offerId_fkey'
    ) THEN
        ALTER TABLE "PromocodeActivation"
        ADD CONSTRAINT "PromocodeActivation_offerId_fkey"
        FOREIGN KEY ("offerId") REFERENCES "Offer"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SavedOffer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SavedOffer_userId_offerId_key" ON "SavedOffer"("userId", "offerId");
CREATE INDEX IF NOT EXISTS "SavedOffer_userId_createdAt_idx" ON "SavedOffer"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SavedOffer_offerId_idx" ON "SavedOffer"("offerId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SavedOffer_userId_fkey'
    ) THEN
        ALTER TABLE "SavedOffer"
        ADD CONSTRAINT "SavedOffer_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SavedOffer_offerId_fkey'
    ) THEN
        ALTER TABLE "SavedOffer"
        ADD CONSTRAINT "SavedOffer_offerId_fkey"
        FOREIGN KEY ("offerId") REFERENCES "Offer"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "UserInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'ONBOARDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserInterest_userId_category_key" ON "UserInterest"("userId", "category");
CREATE INDEX IF NOT EXISTS "UserInterest_category_idx" ON "UserInterest"("category");
CREATE INDEX IF NOT EXISTS "UserInterest_userId_idx" ON "UserInterest"("userId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserInterest_userId_fkey'
    ) THEN
        ALTER TABLE "UserInterest"
        ADD CONSTRAINT "UserInterest_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deviceToken" TEXT;

ALTER TABLE "Deposit" ADD COLUMN IF NOT EXISTS "providerId" TEXT;
ALTER TABLE "Deposit" ALTER COLUMN "provider" SET DEFAULT 'CLICK';
CREATE UNIQUE INDEX IF NOT EXISTS "Deposit_providerId_key" ON "Deposit"("providerId");

CREATE INDEX IF NOT EXISTS "Event_createdAt_idx" ON "Event"("createdAt");
CREATE INDEX IF NOT EXISTS "ChatRoom_updatedAt_idx" ON "ChatRoom"("updatedAt");
CREATE INDEX IF NOT EXISTS "ChatRoom_type_updatedAt_idx" ON "ChatRoom"("type", "updatedAt");
