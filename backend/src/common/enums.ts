export enum Role {
  ADMIN = 'ADMIN',
}

export enum Tier {
  PLATINUM = 'PLATINUM',
}

export enum OfferCategory {
  RESTAURANTS = 'RESTAURANTS',
  MARKETPLACES = 'MARKETPLACES',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  GAMES = 'GAMES',
  COURSES = 'COURSES',
  FITNESS = 'FITNESS',
  OTHER = 'OTHER',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  ESCROW = 'ESCROW',
  ACTIVATED = 'ACTIVATED',
  DISPUTED = 'DISPUTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}
