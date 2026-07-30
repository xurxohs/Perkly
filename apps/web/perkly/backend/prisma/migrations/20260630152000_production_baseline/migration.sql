-- Production baseline captured from the existing server PostgreSQL schema.
-- On the current production database this migration must be marked as applied.
-- On a fresh database it creates the pre-B2B/B2C schema before later migrations run.

CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "offerId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatRoom" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "provider" TEXT NOT NULL DEFAULT 'MOCK',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fullDescription" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "ageLimit" TEXT NOT NULL DEFAULT '0+',
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "imageUrl" TEXT NOT NULL,
    "viewersCount" INTEGER NOT NULL DEFAULT 0,
    "participantsCount" INTEGER NOT NULL DEFAULT 0,
    "organizerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "discountPercent" INTEGER DEFAULT 0,
    "vendorLogo" TEXT,
    "usageInstructions" TEXT,
    "category" TEXT NOT NULL,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "hiddenData" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFlashDrop" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "periodDays" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "sellerId" TEXT NOT NULL,
    "featuredUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT,
    "offerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "monthlyGoal" DOUBLE PRECISION NOT NULL DEFAULT 1000000.0,
    "rewardTriggeredDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TopkaPost" (
    "id" TEXT NOT NULL,
    "postType" TEXT NOT NULL DEFAULT 'event',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT NOT NULL,
    "fullDescription" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "badges" TEXT NOT NULL DEFAULT '[]',
    "date" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "priceText" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "originalUrl" TEXT,
    "poster3x4Url" TEXT,
    "story9x16Url" TEXT,
    "square1x1Url" TEXT,
    "preview16x9Url" TEXT,
    "dominantColor" TEXT,
    "fallbackGradient" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TopkaPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "isGift" BOOLEAN NOT NULL DEFAULT false,
    "giftCode" TEXT,
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "tier" TEXT NOT NULL DEFAULT 'SILVER',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "telegramId" TEXT,
    "phone" TEXT,
    "squadId" TEXT,
    "hasSquadReward" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_ChatParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ChatParticipants_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType" ASC, "createdAt" ASC);
CREATE INDEX "AnalyticsEvent_userId_eventType_createdAt_idx" ON "AnalyticsEvent"("userId" ASC, "eventType" ASC, "createdAt" ASC);
CREATE INDEX "Deposit_userId_status_idx" ON "Deposit"("userId" ASC, "status" ASC);
CREATE UNIQUE INDEX "Dispute_transactionId_key" ON "Dispute"("transactionId" ASC);
CREATE INDEX "Event_category_idx" ON "Event"("category" ASC);
CREATE INDEX "Event_date_idx" ON "Event"("date" ASC);
CREATE INDEX "Event_organizerId_idx" ON "Event"("organizerId" ASC);
CREATE INDEX "Message_roomId_createdAt_idx" ON "Message"("roomId" ASC, "createdAt" ASC);
CREATE INDEX "Message_roomId_isRead_idx" ON "Message"("roomId" ASC, "isRead" ASC);
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId" ASC);
CREATE INDEX "Offer_category_idx" ON "Offer"("category" ASC);
CREATE INDEX "Offer_createdAt_idx" ON "Offer"("createdAt" ASC);
CREATE INDEX "Offer_featuredUntil_idx" ON "Offer"("featuredUntil" ASC);
CREATE INDEX "Offer_isActive_expiresAt_idx" ON "Offer"("isActive" ASC, "expiresAt" ASC);
CREATE INDEX "Offer_isActive_isFlashDrop_idx" ON "Offer"("isActive" ASC, "isFlashDrop" ASC);
CREATE INDEX "Offer_latitude_longitude_idx" ON "Offer"("latitude" ASC, "longitude" ASC);
CREATE INDEX "Offer_sellerId_isActive_idx" ON "Offer"("sellerId" ASC, "isActive" ASC);
CREATE INDEX "Review_authorId_idx" ON "Review"("authorId" ASC);
CREATE INDEX "Review_offerId_idx" ON "Review"("offerId" ASC);
CREATE UNIQUE INDEX "Squad_inviteCode_key" ON "Squad"("inviteCode" ASC);
CREATE INDEX "Subscription_userId_isActive_idx" ON "Subscription"("userId" ASC, "isActive" ASC);
CREATE INDEX "TopkaPost_category_idx" ON "TopkaPost"("category" ASC);
CREATE INDEX "TopkaPost_postType_idx" ON "TopkaPost"("postType" ASC);
CREATE INDEX "TopkaPost_priority_idx" ON "TopkaPost"("priority" ASC);
CREATE INDEX "TopkaPost_status_publishAt_idx" ON "TopkaPost"("status" ASC, "publishAt" ASC);
CREATE INDEX "Transaction_buyerId_createdAt_idx" ON "Transaction"("buyerId" ASC, "createdAt" ASC);
CREATE INDEX "Transaction_buyerId_status_idx" ON "Transaction"("buyerId" ASC, "status" ASC);
CREATE UNIQUE INDEX "Transaction_giftCode_key" ON "Transaction"("giftCode" ASC);
CREATE INDEX "Transaction_offerId_idx" ON "Transaction"("offerId" ASC);
CREATE INDEX "Transaction_status_createdAt_idx" ON "Transaction"("status" ASC, "createdAt" ASC);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email" ASC);
CREATE INDEX "User_role_idx" ON "User"("role" ASC);
CREATE INDEX "User_squadId_idx" ON "User"("squadId" ASC);
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId" ASC);
CREATE INDEX "User_tier_idx" ON "User"("tier" ASC);
CREATE INDEX "_ChatParticipants_B_index" ON "_ChatParticipants"("B" ASC);

ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_ChatParticipants" ADD CONSTRAINT "_ChatParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ChatParticipants" ADD CONSTRAINT "_ChatParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
