import { Prisma } from '@prisma/client';

const SELLER_PUBLIC_SELECT = {
  id: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export const USER_ADMIN_SELECT = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  tier: true,
  balance: true,
  rewardPoints: true,
  telegramId: true,
  phone: true,
  squadId: true,
  hasSquadReward: true,
  accountStatus: true,
  suspensionReason: true,
  suspendedAt: true,
  suspendedUntil: true,
  suspendedBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const PUBLIC_OFFER_SELECT = {
  id: true,
  title: true,
  description: true,
  price: true,
  discountPercent: true,
  vendorLogo: true,
  imageUrl: true,
  thumbnailUrl: true,
  images: true,
  usageInstructions: true,
  category: true,
  fulfillmentType: true,
  isExclusive: true,
  isActive: true,
  isFlashDrop: true,
  expiresAt: true,
  periodDays: true,
  latitude: true,
  longitude: true,
  sellerId: true,
  featuredUntil: true,
  createdAt: true,
  updatedAt: true,
  seller: { select: SELLER_PUBLIC_SELECT },
  _count: {
    select: {
      promocodes: {
        where: {
          status: 'ACTIVE',
        },
      },
    },
  },
} satisfies Prisma.OfferSelect;

export const VENDOR_OFFER_SELECT = {
  id: true,
  title: true,
  description: true,
  price: true,
  discountPercent: true,
  vendorLogo: true,
  imageUrl: true,
  thumbnailUrl: true,
  images: true,
  usageInstructions: true,
  category: true,
  fulfillmentType: true,
  isExclusive: true,
  hiddenData: true,
  isActive: true,
  isFlashDrop: true,
  expiresAt: true,
  periodDays: true,
  latitude: true,
  longitude: true,
  sellerId: true,
  featuredUntil: true,
  moderationStatus: true,
  moderationNote: true,
  moderationAt: true,
  moderationBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OfferSelect;

export const PURCHASED_OFFER_SELECT = {
  id: true,
  title: true,
  description: true,
  price: true,
  discountPercent: true,
  vendorLogo: true,
  imageUrl: true,
  thumbnailUrl: true,
  images: true,
  usageInstructions: true,
  category: true,
  fulfillmentType: true,
  hiddenData: true,
  periodDays: true,
  sellerId: true,
} satisfies Prisma.OfferSelect;

export const ADMIN_OFFER_SELECT = {
  ...VENDOR_OFFER_SELECT,
  seller: { select: USER_ADMIN_SELECT },
} satisfies Prisma.OfferSelect;

export const SAVED_OFFER_SELECT = {
  id: true,
  userId: true,
  offerId: true,
  source: true,
  createdAt: true,
  offer: { select: PUBLIC_OFFER_SELECT },
} satisfies Prisma.SavedOfferSelect;

export type PublicOffer = Prisma.OfferGetPayload<{
  select: typeof PUBLIC_OFFER_SELECT;
}>;

export type VendorOffer = Prisma.OfferGetPayload<{
  select: typeof VENDOR_OFFER_SELECT;
}>;

export type PurchasedOffer = Prisma.OfferGetPayload<{
  select: typeof PURCHASED_OFFER_SELECT;
}>;

export type AdminOffer = Prisma.OfferGetPayload<{
  select: typeof ADMIN_OFFER_SELECT;
}>;

export type SavedOffer = Prisma.SavedOfferGetPayload<{
  select: typeof SAVED_OFFER_SELECT;
}>;
