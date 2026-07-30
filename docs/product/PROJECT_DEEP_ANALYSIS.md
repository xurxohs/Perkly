# Perkly: глубокий анализ проекта

Дата: 2026-07-01  
Актуальный backend/frontend commit: `6a28e2b`  
Production: `https://perkly.uz`

## 1. Короткий вывод

Perkly сейчас уже не MVP-прототип. Это работающая платформа с backend, web, PostgreSQL, Prisma migrations, Telegram login, seller/admin кабинетами, escrow-покупками, чатами, спорами, Topka, Apple Wallet, аналитикой, B2B заявками компаний и production deploy.

Главная хорошая новость: инфраструктура, production DB, миграции, audit cleanup и базовая B2B role foundation уже закрыты и задеплоены.

Главное, что осталось: превратить заложенную B2B/B2C схему в полноценные продуктовые сценарии. В базе уже есть модели `B2CProfile`, `Company`, `Promocode`, `PromocodeActivation`, `SavedOffer`, `UserInterest`, но API/UI для части этих сущностей еще не реализованы.

Последний выполненный пакет правок закрывает явные P0/P1 риски:

- payment top-up: production web больше не вызывает mock webhook, а редиректит на Click payment URL;
- dev mock endpoint `/payments/webhook/mock` добавлен, но backend запрещает его в `NODE_ENV=production`;
- `POST /reviews` закрыт JWT, author берется только из токена;
- analytics принимает `userId` только после `JwtService.verify()`;
- `GET /analytics/events` переведен на `RolesGuard` + `@Roles('ADMIN')`;
- `deploy.sh` больше не хранит SSH password в файле и выставляет `NODE_ENV=production` на сервере.
- server git stash разобран: патчи сохранены в `/var/backups/perkly-stashes/20260701-194802`, stash list очищен;
- runtime uploads и SQLite backup добавлены в `.gitignore`, production `git status` чистый;
- backend `PromocodesModule` добавлен: B2B create/edit/list/status и B2C activate/copy/use/history.
- seller dashboard UI для промокодов добавлен: список, создание, pause/activate/archive, счетчик активаций.
- B2C profile UI для активированных промокодов добавлен: вкладка, список, copy/use actions.
- checkout интегрирован с DB-промокодами: покупка принимает `promocodeActivationId`, валидирует ownership/status/offer/company и гасит activation при успешной покупке.
- финансовая атрибуция промокода в transaction добавлена: `promocodeActivationId`, `promocodeDiscount`, `promocodeCodeSnapshot`.
- лимиты промокодов добавлены: общий `maxActivations` и `perUserLimit` на пользователя.
- аналитика эффективности промокодов добавлена: activation/copy/use rates и quota usage для seller dashboard.

## 2. Что уже есть и на каком уровне

| Блок | Текущее состояние | Уровень |
| --- | --- | --- |
| Production deploy | `deploy.sh` тянет `main`, применяет Prisma migrations, билдит backend/frontend, рестартит PM2. Пароль теперь берется из env/SSH key, на сервер передается `NODE_ENV=production`. | Хороший |
| PostgreSQL + Prisma | Production DB переведена на Prisma Migrate через baseline, миграции актуальны. | Хороший |
| Security audit | Backend и frontend production audit: `0 vulnerabilities`. | Хороший |
| Авторизация | Email/password, JWT, Telegram login, Telegram Mini App login, rate limit auth endpoints. | Сильный |
| Роли | `USER`, `VENDOR`, `ADMIN`, guards на B2B/admin endpoints. | Хороший |
| B2B компания | Есть `Company`, заявка `/companies/apply`, админ-модерация, статусы, INN 9 цифр. | База готова |
| Vendor offer guard | Обычный продавец может создавать офферы только при `ACTIVE` company. | Хороший |
| Admin companies UI | Есть страница `/admin/companies`, фильтры и действия approve/suspend/pending. | Работает |
| Seller dashboard | Есть `/sell`, `/sell/dashboard`, seller stats/offers/transactions. | Частично сильный |
| Marketplace | Офферы, покупки, escrow, gifts, chats, disputes, reviews, Apple Wallet. | Выше ТЗ |
| Telegram | Login, bot, уведомления, Telegram Mini App сценарии. | Сильный |
| B2C engagement | Баланс, points, wheel, daily bonus, missions, squad rewards, tiers. | Сильный |
| Home feed | Персонализация на основе покупок, nearby, flash drops, tier offers, events. | Сильный |
| Topka | Отдельная медиа/ивент часть, админка публикаций и загрузок. | Сильный |
| Tests | 25 backend spec-файлов, 88 tests проходят. | Средний |

## 3. Что не трогать без причины

Эти части уже на хорошем уровне и их лучше развивать аккуратно, без переписывания:

- Prisma baseline/migrations. Production DB уже управляется Prisma Migrate, ломать историю миграций нельзя.
- `deploy.sh` flow. Он работает end-to-end: pull, migrate, build, PM2 restart.
- Telegram auth flow. Есть несколько сценариев, они связаны с bot service и Mini App.
- Home feed logic. Там уже много бизнес-логики: geo, tier, streak, missions, savings, personalization.
- Topka admin/media. Это отдельный сильный функциональный модуль внутри Perkly; его не надо смешивать с B2B-промокодами.
- Apple Wallet pass generation. Оно подключено к сертификатам и транзакциям; менять только с отдельным тестом pkpass.
- Audit overrides. Они сейчас закрывают production audit; убирать их нельзя без повторного audit.

## 4. Что осталось по ТЗ

### 4.1. Промокоды

Статус: backend API, seller UI, B2C activated UI и checkout integration готовы.

В базе уже есть:

- `Promocode`
- `PromocodeActivation`
- связь `Company -> Promocode`
- связь `Offer -> Promocode`
- activation fields: `copiedAt`, `usedAt`, `expiresAt`, `codeSnapshot`

Backend уже добавлен:

- `PromocodesModule`
- `GET /promocodes/company/me`
- `POST /promocodes`
- `PATCH /promocodes/:id`
- `PATCH /promocodes/:id/status`
- `POST /promocodes/:id/activate`
- `POST /promocodes/activations/:id/copy`
- `POST /promocodes/activations/:id/use`
- `GET /users/me/promocode-activations`
- валидация discount/date/status/codeType/code
- ownership: vendor управляет только промокодами своей company, B2C user управляет только своими activations

Seller UI уже добавлен:

- раздел "Промокоды" в `/sell/dashboard`;
- создание STATIC/DYNAMIC промокода;
- привязка к offer или ко всей company;
- статусные действия ACTIVE/PAUSED/ARCHIVED;
- отображение скидки, кода, срока, количества активаций.

B2C UI уже добавлен:

- вкладка "Промокоды" в `/profile`;
- список активированных промокодов;
- copy action через backend `copyActivation`;
- use action через backend `useActivation`;
- отображение бренда, offer, скидки, срока и статуса.

Что еще можно улучшить:

- вывести финансовую атрибуцию скидок в admin/company revenue reports.

Важно: старый hardcoded словарь `WELCOME10`, `PRKLY-GOLD`, `PRKLY-PLAT`, `PRKLY-VIP` убран из purchase flow. Checkout теперь работает через активированные `PromocodeActivation` из БД.

Что сделать:

1. Опционально вывести `promocodeDiscount` в revenue reports.

### 4.2. B2C профиль

Статус: модель есть, API/UI нет.

В базе уже есть:

- `B2CProfile`
- `birthDate`
- `birthYear`
- `gender`
- `city`
- `anonymousId`

Чего нет:

- endpoints для чтения/обновления B2C profile
- сохранение onboarding data из web register
- связь anonymous session -> user profile
- нормальная настройка интересов пользователя

Что сделать:

1. Добавить `ProfilesModule` или расширить `UsersModule`.
2. Endpoint `GET /users/me/profile`.
3. Endpoint `PATCH /users/me/profile`.
4. При регистрации сохранять `birthYear`, `city`, `gender`, `interests`.
5. При логине связывать `X-Session-Id` с `B2CProfile.anonymousId`.

### 4.3. User interests

Статус: таблица есть, продуктового сценария нет.

В базе уже есть:

- `UserInterest`
- `category`
- `weight`
- `source`

Чего нет:

- запись интересов из onboarding
- ручное редактирование интересов в профиле
- автообновление веса по просмотрам/покупкам
- использование `UserInterest` в Home feed/recommendations

Что сделать:

1. `GET /users/me/interests`.
2. `PUT /users/me/interests`.
3. На analytics events обновлять weights.
4. В Home feed учитывать `UserInterest` перед fallback по transactions.

### 4.4. Saved offers

Статус: backend API и базовый UI готовы.

В базе уже есть:

- `SavedOffer`
- unique `userId + offerId`

Backend уже добавлен:

- `POST /offers/:id/save`
- `DELETE /offers/:id/save`
- `GET /users/me/saved-offers`

Frontend уже добавлен:

- кнопка сохранить/удалить на странице оффера;
- раздел "Сохранённые" в профиле;
- удаление оффера из сохранённых из профиля.

Что еще можно улучшить:

- saved state прямо на карточках каталога/feed.

### 4.5. B2B company кабинеты

Статус: company moderation есть, но полноценной B2B организации еще нет.

Что есть:

- один owner на company
- `legalName`, `brandName`, `inn`, `phone`, `status`
- модерация админом
- active company guard при создании оффера

Чего нет:

- сотрудники компании
- роли внутри компании: owner/manager/analyst
- company-level dashboard
- отчеты по промокодам/активациям
- billing/subscription на уровне компании
- документы/юридическая верификация

Текущее ограничение: `Company.ownerUserId` unique означает "один пользователь - одна компания". Для MVP нормально. Для полноценного B2B нужно добавлять `CompanyMember`.

## 5. Конкретные баги и риски

### Закрыто. Payment mock endpoint не совпадал

Раньше frontend вызывал:

```text
POST /payments/webhook/mock
```

а backend имел только:

```text
POST /payments/webhook/click
```

Что сделано:

- добавлен JWT endpoint `/payments/webhook/mock` для local/dev сценария;
- в production frontend после `topUp` редиректит на `paymentUrl`;
- backend запрещает mock completion при `NODE_ENV=production`;
- добавлены targeted tests для service/controller.

### Закрыто. Hardcoded SSH password в deploy script

`deploy.sh` больше не хранит server access credentials прямо в файле.

Что сделано:

- `SERVER_PASS` берется из env;
- если env не задан, script останавливается с понятной ошибкой;
- на сервер передается `NODE_ENV=production`.

Важно: старый пароль уже был в локальном файле, поэтому его нужно заменить на сервере/у провайдера и перейти на SSH key.

### Закрыто. Reviews можно было создавать без JWT

Раньше `ReviewsController.create()` был публичный и мог принять автора из body через Prisma input.

Что сделано:

- `POST /reviews` закрыт через JWT;
- `authorId` берется только из `req.user.userId`;
- service валидирует `offerId`, `rating`, `comment`;
- добавлены targeted tests.

Что еще можно улучшить:

- разрешать review только после покупки/активации оффера;
- добавить unique rule, если нужна только одна review на пользователя и оффер.

### Закрыто. Analytics userId можно было подделать

Раньше `AnalyticsController.trackEvent()` вручную декодировал JWT payload без signature verify.

Что сделано:

- используется `JwtService.verify()`;
- если токен невалидный, событие пишется как anonymous/session event;
- добавлены targeted tests.

### Закрыто. Admin analytics authorization возвращал data/error вместо 403

Раньше `GET /analytics/events` был закрыт JWT, но admin роль проверялась вручную и возвращала `{ data: [], error: 'Unauthorized' }`.

Что сделано:

- используется `RolesGuard` + `@Roles('ADMIN')`;
- не-admin получает нормальный guard deny/403 flow.

### P1. Role/status поля строковые

Роли и статусы сейчас строки. Это гибко, но можно случайно записать невалидное значение через admin update или прямые операции.

Решение:

- добавить enum на уровне Prisma или централизованные validators;
- минимум: validation в admin user update и company status.

### P1. JWT access token живет 1 день

В ТЗ был вариант access token 15 минут + refresh token 30 дней. Сейчас `expiresIn: '1d'`, refresh flow нет.

Решение:

- добавить refresh token модель/table или hashed refresh token field;
- `POST /auth/refresh`;
- access token 15m.

### P2. Demo/fallback data в production UX

В нескольких frontend местах есть demo events fallback:

- feed/search/news/plans используют `/demo-events/...`;
- comments прямо говорят "Use demo events if API returns empty".

Это не критично, но для production лучше отделить demo mode от реального режима.

## 6. Что осталось по инфраструктуре

Закрыто:

- production deploy работает;
- backend/frontend online;
- Prisma migrations status clean;
- backend/frontend production audit clean;
- сайт/API отвечают.

Закрыто:

1. Server git stash разобран и сохранен архивом:

   - `/var/backups/perkly-stashes/20260701-194802`
2. Stash list на сервере очищен.
3. Runtime uploads и SQLite backup добавлены в `.gitignore`.
4. Production repo status чистый.
5. Deploy уже работает через SSH key без пароля в файле.

Осталось:

1. Решить, должны ли uploads храниться на диске VPS или перейти в object storage.
2. Ротировать старый SSH/root пароль, потому что он раньше был в локальном файле.

## 7. Что осталось по качеству

Есть 25 backend spec-файлов, но покрытие все еще неравномерное.

Уже добавлены targeted tests:

- `POST /reviews` требует JWT и не принимает чужой `authorId`.
- `POST /payments/webhook/mock` или удаление frontend mock flow.
- `AnalyticsController`: fake JWT не может подставить `userId`.
- `PromocodesService`: ownership, invalid discount/date/status, dynamic/static code transition, activation/copy/use.
- `TransactionsService`: checkout применяет DB-promocode activation и отклоняет activation от другого offer.

Нужно добавить тесты:

- `SavedOffer`: duplicate save не создает дубли.
- `B2CProfile`: onboarding save, anonymous id attach.
- `CompanyService.updateStatus`: company update + user role update лучше в transaction.

## 8. Приоритетный план работ

### P0: закрыть явные продуктовые/безопасностные дырки

1. Закрыто: payment mock mismatch.
2. Закрыто: `POST /reviews` JWT и author ownership logic.
3. Закрыто: analytics JWT verification и admin role guard.
4. Закрыто: hardcoded SSH password убран из deploy flow.
5. Закрыто: server stash разобран и архивирован.

### P1: реализовать промокоды по ТЗ

1. Закрыто backend: `PromocodesModule`.
2. Закрыто backend: B2B create/edit/list/status.
3. Закрыто backend: B2C activate/copy/use/history.
4. Закрыто frontend: UI seller "Промокоды".
5. Закрыто frontend: UI profile "Активированные".
6. Закрыто backend/frontend: checkout использует DB-promocode activation вместо hardcoded promo map.
7. Закрыто backend/frontend: лимиты `maxActivations` и `perUserLimit`.
8. Закрыто backend/frontend: аналитика эффективности промокодов.

### P1: реализовать B2C profile/interests/saved offers

1. `B2CProfile` API.
2. `UserInterest` API и запись из onboarding.
3. Закрыто: `SavedOffer` API.
4. Частично закрыто: профильный раздел и save button на offer detail; осталось saved state на карточках каталога/feed.
5. Home feed использует interests.

### P2: развить B2B company

1. Company dashboard.
2. Company analytics по промокодам.
3. Company members.
4. Internal roles.
5. Legal verification docs.

### P2: auth/session hardening

1. Refresh token flow.
2. Access token 15m.
3. Session/device management.
4. Optional token rotation.

### P3: production polish

1. Object storage for uploads.
2. CI checks: backend tests, frontend build, audit.
3. Error monitoring.
4. DB backups/restore drill.
5. Rate limits не только auth, но и reveal/copy/payment endpoints.

## 9. Итог

Проект находится в хорошем состоянии для следующего этапа. Самое тяжелое основание уже есть:

- production;
- DB migrations;
- роли;
- B2B company approval;
- audit clean;
- seller/admin flows;
- сильный marketplace foundation.

Дальше не нужно переписывать архитектуру. Нужно последовательно достроить недостающие бизнес-модули поверх уже созданной схемы:

```text
Promocodes -> Activations -> SavedOffers -> B2CProfile/Interests -> Company analytics
```

Самый логичный следующий шаг: закрыть P0 баги, потом начать `PromocodesModule`.
