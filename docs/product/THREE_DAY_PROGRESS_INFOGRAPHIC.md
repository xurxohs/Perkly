# Perkly Progress: что сделали за последние 3 дня

Период: последние 3 дня работы над backend, web и PerklyApp Swift/iOS.

## Большая картина

```text
До:
Perkly = marketplace + офферы + покупки + базовый seller flow

После:
Perkly = marketplace + B2B/B2C база + server-side saved + полноценные промокоды
       + iOS синхронизация с backend + seller/company flow + production deploy
```

## Инфографика статуса

```text
┌──────────────────────────────┬──────────────┬────────────────────────────────────┐
│ Блок                         │ Статус       │ Что изменилось                     │
├──────────────────────────────┼──────────────┼────────────────────────────────────┤
│ Backend security             │ ГОТОВО       │ payment/reviews/analytics hardening │
│ B2B/B2C database foundation   │ ГОТОВО       │ Company, B2CProfile, interests      │
│ Promocodes backend            │ ГОТОВО       │ create/activate/copy/use/analytics  │
│ Promocode checkout            │ ГОТОВО       │ promocodeActivationId в покупке      │
│ Saved offers backend          │ ГОТОВО       │ server-side save/unsave/list         │
│ B2C profile/interests API     │ ГОТОВО       │ profile + interests endpoints        │
│ Offer promocodes API          │ ГОТОВО       │ доступные промокоды для offer        │
│ Web profile/cart/seller       │ ГОТОВО       │ промокоды и saved offers             │
│ iOS saved offers              │ ГОТОВО       │ catalog/detail/profile               │
│ iOS promocodes                │ ГОТОВО       │ profile/cart/offer detail/seller     │
│ iOS company onboarding        │ ГОТОВО       │ apply/status/gating seller tools     │
│ iOS B2C personalization       │ ГОТОВО       │ city/gender/birthYear/interests      │
│ Apple Wallet UI               │ ГОТОВО       │ Wallet button уже есть               │
│ Production deploy             │ ГОТОВО       │ сервер обновлен, PM2 online          │
│ Full iOS xcodebuild           │ БЛОКЕР      │ Xcode SDK/runtime mismatch           │
└──────────────────────────────┴──────────────┴────────────────────────────────────┘
```

## 1. Backend: что добавили

### Безопасность и production hardening

- Закрыли mock payment webhook для production.
- Reviews теперь защищены JWT.
- Analytics userId проверяется через JWT.
- Admin analytics закрыта через role guard.
- Deploy очищен от паролей и мусорных runtime файлов.
- Уменьшены dependency audit риски без опасного `audit fix --force`.

### B2B/B2C фундамент

- Добавлены/подключены сущности:
  - `Company`
  - `B2CProfile`
  - `UserInterest`
  - `Promocode`
  - `PromocodeActivation`
  - `SavedOffer`
- Добавлены company statuses:
  - `PENDING_MODERATION`
  - `ACTIVE`
  - `SUSPENDED`

### Promocodes backend

- `GET /promocodes/company/me`
- `GET /promocodes/company/me/analytics`
- `POST /promocodes`
- `PATCH /promocodes/:id`
- `PATCH /promocodes/:id/status`
- `POST /promocodes/:id/activate`
- `POST /promocodes/activations/:id/copy`
- `POST /promocodes/activations/:id/use`
- `GET /users/me/promocode-activations`
- `GET /offers/:offerId/promocodes`

### Promocode checkout

- Checkout принимает `promocodeActivationId`.
- Backend проверяет ownership/status/offer/company.
- После покупки activation становится `USED`.
- В transaction сохраняется:
  - `promocodeActivationId`
  - `promocodeDiscount`
  - `promocodeCodeSnapshot`

### Saved offers backend

- `POST /offers/:id/save`
- `DELETE /offers/:id/save`
- `GET /users/me/saved-offers`
- Защита от дублей через `upsert`.

### B2C profile/interests API

- `GET /users/me/profile`
- `PATCH /users/me/profile`
- `GET /users/me/interests`
- `PUT /users/me/interests`
- Дополнительно оставлена совместимость через `POST/PATCH /users/me/interests`.

## 2. Web: что улучшили

### Seller dashboard

- Seller может создавать промокоды.
- Есть STATIC/DYNAMIC code type.
- Есть лимиты:
  - общий лимит активаций;
  - лимит на пользователя.
- Есть status actions:
  - active;
  - paused;
  - archived.
- Есть analytics:
  - activations;
  - copied;
  - used;
  - copy rate;
  - use rate;
  - quota usage.

### Profile

- Добавлена вкладка активированных промокодов.
- Добавлена работа с saved offers.
- Можно copy/use промокоды.
- Можно удалить saved offer.

### Cart

- Cart умеет выбирать activated promocode.
- Итоговая сумма пересчитывается.
- Покупка уходит с `promocodeActivationId`.

## 3. PerklyApp Swift/iOS: что добавили

### Server-side saved offers

- Catalog больше не зависит только от локального `@AppStorage`.
- Save/unsave идет через backend.
- Saved offers показываются в profile.
- Offer detail получил heart-кнопку save/unsave.

### Promocode activations

- Добавлены Swift models:
  - `Promocode`
  - `PromocodeActivation`
  - `PromocodeAnalytics`
- Profile показывает активированные промокоды.
- Cart показывает применимые activation-промокоды.
- Purchase отправляет `promocodeActivationId`.

### Offer detail promocodes

- Offer detail грузит доступные промокоды через backend.
- Показывает блок "Доступные промокоды".
- Есть CTA "Активировать".
- После activation промокод помечается активированным.

### Catalog promo badges

- Backend отдаёт `_count.promocodes`.
- iOS показывает бейдж "Промокод" на catalog cards/hero, если у offer есть активный промокод.

### Seller promocodes iOS

- Seller dashboard показывает промокоды компании.
- Есть create STATIC/DYNAMIC.
- Есть edit sheet.
- Есть status actions.
- Есть analytics summary.
- Есть validFrom/validTo date pickers.

### B2B company onboarding iOS

- Добавлен `Company` model.
- Добавлен `CompaniesService`.
- Seller dashboard проверяет `/companies/me`.
- Если компании нет, показывает форму заявки.
- Если pending, показывает ожидание модерации.
- Если suspended, блокирует seller tools.
- Если active, открывает seller tools.

### B2C personalization iOS

- Onboarding отправляет `birthYear` и interests на backend.
- Profile settings получил экран "Персонализация".
- Можно менять:
  - city;
  - gender;
  - birthYear;
  - interests.

### Apple Wallet

- Проверено, что UI уже есть:
  - кнопка "Добавить в Apple Wallet";
  - `.pkpass` download;
  - PassKit presentation;
  - обработка ошибок.

## 4. Deploy/production

### Последние backend commits

```text
bf687d6 feat: include offer promocode count
5490091 feat: expose offer promocodes
9738040 feat: add b2c profile interests api
6a28e2b feat: add saved offers
9fe9305 feat: store promocode attribution on transactions
3f7fb21 feat: add promocode analytics
7e7d847 feat: add promocode activation limits
8af7c71 feat: apply db promocodes at checkout
0bbcc9a feat: add profile promocodes tab
1984e14 feat: add seller promocodes UI
081d058 feat: add promocodes API
dedfd91 chore: ignore runtime uploads and sqlite backups
84766ac fix: harden payments reviews and analytics
098b055 Resolve backend audit overrides
64b7d6e Reduce dependency audit findings
847a6ad Implement B2B role foundation
```

### Production status

- Server updated to latest backend commit: `bf687d6`.
- `perkly-backend`: online.
- `frontend`: online.
- Prisma migrations: no pending migrations.
- Backend tests: `25 suites`, `88 tests` passing.
- Frontend production build: passing.

## 5. Что стало сильнее

```text
Marketplace        ██████████  сильный
Promocodes         ██████████  почти полный цикл
B2B foundation     ████████░░  company flow есть, роли внутри компании потом
B2C personalization████████░░  profile/interests есть, recommendation logic можно усилить
iOS sync           █████████░  основные backend-фичи подключены
Production deploy  ██████████  работает
Testing            ████████░░  backend strong, iOS full build blocked by Xcode runtime
```

## 6. Что осталось

### Технический блокер

- Полный `xcodebuild` пока блокируется локальным Xcode SDK/runtime mismatch.
- Нужно установить совместимый iOS Simulator runtime или обновить Xcode Components.

### Ручная проверка на устройстве

- login/register;
- company apply/status;
- seller promocode create/edit/status;
- offer detail promocode activation;
- cart с `promocodeActivationId`;
- catalog promo badges;
- profile personalization;
- Apple Wallet на реальном устройстве.

### Будущие улучшения

- Внутренние роли компании: owner/manager/analyst.
- Юридические документы компании.
- Company billing/subscription.
- Более глубокая recommendation logic на основе `UserInterest`.
- Refresh token/session management для iOS.

## Итог

За последние 3 дня Perkly перешёл от набора сильных отдельных фич к более цельной B2B/B2C платформе:

- backend получил полноценную промокодную архитектуру;
- saved offers стали server-side;
- iOS подтянул основные backend-фичи;
- seller flow стал ближе к реальному B2B кабинету;
- B2C personalization теперь хранится на backend;
- production регулярно деплоится и проходит проверки.
