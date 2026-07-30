# Perkly: карта архитектуры

## Общая карта

```text
                 ┌────────────────────┐
                 │      Perkly API     │
                 │   NestJS + Prisma   │
                 └─────────┬──────────┘
                           │
                    PostgreSQL
```

```text
iOS App ─────┐
Web App ─────┼──> API Gateway / Backend ───> PostgreSQL
Telegram ────┘
```

## B2C flow: пользовательская сторона

```text
User
 │
 ├── B2CProfile
 │    ├── birthYear
 │    ├── gender
 │    └── city
 │
 ├── UserInterest
 │    ├── category
 │    ├── weight
 │    └── source
 │
 ├── SavedOffer
 │    └── Offer
 │
 ├── PromocodeActivation
 │    ├── ISSUED
 │    ├── COPIED
 │    └── USED
 │
 └── Transaction
      ├── offerId
      ├── promocodeActivationId
      ├── promocodeDiscount
      └── promocodeCodeSnapshot
```

## B2B flow: бизнес-сторона

```text
Company
 │
 ├── status
 │    ├── PENDING_MODERATION
 │    ├── ACTIVE
 │    └── SUSPENDED
 │
 ├── Offer
 │    ├── title
 │    ├── price
 │    ├── category
 │    └── hiddenData
 │
 ├── Promocode
 │    ├── STATIC / DYNAMIC
 │    ├── discountValue
 │    ├── maxActivations
 │    ├── perUserLimit
 │    ├── validFrom
 │    └── validTo
 │
 └── Analytics
      ├── activations
      ├── copied
      ├── used
      ├── copyRate
      └── useRate
```

## Жизненный цикл промокода

```text
Seller создаёт Promocode
        │
        ▼
Пользователь видит promo на Offer Detail
        │
        ▼
Пользователь активирует promo
        │
        ▼
PromocodeActivation = ISSUED
        │
        ├── Copy -> COPIED
        │
        └── Checkout -> USED
                    │
                    ▼
              Transaction stores attribution
```

## Сохранённые офферы

```text
iOS/Web/Telegram
      │
      ▼
POST /offers/:id/save
      │
      ▼
SavedOffer(userId, offerId)
      │
      ▼
GET /users/me/saved-offers
```

## iOS integration map

```text
AuthViewModel
 └── AuthService

CatalogViewModel
 ├── OffersService
 └── UsersService.getSavedOffers

OfferDetailViewModel
 ├── OffersService.getById
 ├── PromocodesService.listForOffer
 ├── PromocodesService.activate
 └── OffersService.saveOffer

CartViewModel
 ├── PromocodesService.listMyActivations
 └── TransactionsService.purchase(promocodeActivationId)

SellerViewModel
 ├── CompaniesService.getMine/apply
 ├── SellerService
 └── PromocodesService

ProfileViewModel
 ├── UsersService.getB2CProfile/updateB2CProfile
 ├── UsersService.getInterests/updateInterests
 ├── UsersService.getSavedOffers
 └── PromocodesService.listMyActivations
```

## Доверие и модерация

```text
Company application
       │
       ▼
Admin moderation
       │
       ├── ACTIVE -> seller tools enabled
       └── SUSPENDED -> seller tools locked
```

## Почему эта архитектура важна

Perkly can connect:
Perkly может связать:

- кто пользователь;
- что ему интересно;
- какие офферы он сохраняет;
- какой промокод он активирует;
- что он покупает;
- какая компания привела продажу.

Это создаёт основу для персонализации, аналитики продавца и оптимизации промокампаний.
