CREATE TABLE "CatalogBanner" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '/catalog',
    "altText" TEXT NOT NULL DEFAULT 'Баннер Perkly',
    "width" INTEGER NOT NULL DEFAULT 1600,
    "height" INTEGER NOT NULL DEFAULT 600,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CatalogBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatalogBanner_isActive_sortOrder_idx" ON "CatalogBanner"("isActive", "sortOrder");
