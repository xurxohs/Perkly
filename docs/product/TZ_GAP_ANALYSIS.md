# Perkly: понятный анализ по ТЗ B2B/B2C

Дата анализа: 2026-06-30

Проверено:

- `PerklyApp` — iOS приложение.
- `perkly/backend` — backend на NestJS + Prisma + PostgreSQL.
- `perkly/frontend` — web на Next.js.
- ТЗ — архитектура БД, B2B/B2C роли, промокоды, личные кабинеты, Telegram, CDP.

## Самый короткий вывод

Perkly уже сделан не как простой сайт промокодов, а как более сильная платформа: есть офферы, покупки, escrow, баланс, баллы, Telegram, подарки, чаты, споры, seller dashboard, гео, избранное, Topka и Apple Wallet.

Но по ТЗ не хватает главного: отдельной B2B/B2C архитектуры в базе данных.

Сейчас система построена так:

```text
User -> Offer -> Transaction
```

А ТЗ просит такую структуру:

```text
users
profiles_b2c
companies_b2b
promocodes
promocode_activations
```

Лучшее решение: не ломать текущий Perkly, потому что в нем уже много сильных функций. Нужно аккуратно добавить недостающие таблицы и сценарии по ТЗ поверх текущей системы.

## Что уже есть и на каком уровне

| Блок | Что есть сейчас | Уровень |
| --- | --- | --- |
| PostgreSQL + Prisma | Backend уже использует PostgreSQL через Prisma. Есть модели `User`, `Offer`, `Transaction`, `AnalyticsEvent` и другие. | Хороший |
| Авторизация | Есть email/password, JWT, Telegram login, Telegram Mini App login. | Очень хороший |
| Роли | Есть роли `USER`, `VENDOR`, `ADMIN`. Backend умеет закрывать vendor/admin endpoints через guard. | Хороший, но не совпадает с ТЗ по названиям |
| B2C профиль | Есть баланс, Perkly Points, история, покупки, подарки, подписки, рекомендации, Telegram binding. | Сильный |
| B2B / seller | Есть seller dashboard, статистика, список офферов, транзакции, создание оффера. | Частично готов |
| Каталог | Есть категории, поиск, flash drops, nearby, featured, stores, favorites. | Сильный |
| Карточки скидок | Есть скидка, таймер, гео, featured/flash бейджи, скрытый код/hiddenData. | Хороший |
| Telegram | Есть login, bot, referrals, gifts, nearby, profile, notifications. | Очень сильный |
| Геймификация | Есть Perkly Points, wheel, daily bonus, missions, squad rewards, tiers. | Выше уровня ТЗ |
| Marketplace | Есть escrow, gifts, chats, disputes, reviews, Apple Wallet, seller promotion. | Выше уровня ТЗ |
| Analytics/CDP | Есть `sessionId` и события аналитики. | Начальный уровень |
| QA/tests | Есть часть backend тестов. | Частично |

## Что есть, но не совсем так, как в ТЗ

### 1. Пользователи

В ТЗ:

- есть базовая таблица `users`;
- отдельно есть профиль B2C пользователя `profiles_b2c`;
- у пользователя есть роль `B2C_USER` или `B2B_MERCHANT`;
- телефон должен быть важным идентификатором;
- должен быть `anonymous_id` для CDP.

В Perkly сейчас:

- есть `User`;
- в `User` уже лежат email, password, role, balance, rewardPoints, telegramId, phone;
- отдельной таблицы B2C профиля нет;
- роли называются `USER`, `VENDOR`, `ADMIN`;
- `anonymous_id` как часть профиля пользователя не реализован.

Что нужно сделать:

- добавить отдельную модель `B2CProfile`;
- хранить там дату рождения, город, интересы или ссылку на интересы, `anonymousId`;
- решить, оставляем роли `USER/VENDOR` или переименовываем в `B2C_USER/B2B_MERCHANT`;
- сделать нормальную связь anonymous session -> user после логина.

### 2. B2B компании

В ТЗ:

- B2B пользователь должен подать заявку компании;
- у компании должны быть `legal_name`, `brand_name`, `inn`;
- ИНН должен проверяться как 9 цифр;
- у компании должен быть статус `PENDING_MODERATION`, `ACTIVE`, `SUSPENDED`;
- только активная компания может создавать промокоды.

В Perkly сейчас:

- продавец — это просто пользователь с ролью `VENDOR`;
- отдельной компании нет;
- ИНН нет;
- модерации компании нет;
- legal name и brand name не разделены.

Что нужно сделать:

- добавить таблицу `Company`;
- добавить заявку партнера: `POST /companies/apply`;
- добавить экран "Стать партнером";
- добавить проверку ИНН;
- добавить админ-модерацию компании;
- разрешать создание B2B промокодов только если компания `ACTIVE`.

### 3. Промокоды

В ТЗ:

- должна быть отдельная таблица `promocodes`;
- у промокода есть `code_type`: `STATIC` или `DYNAMIC`;
- есть размер скидки;
- есть даты `valid_from` и `valid_to`;
- есть таблица `promocode_activations`;
- когда пользователь нажал "Показать код", это должно записываться как активация/выдача.

В Perkly сейчас:

- вместо промокода используется `Offer`;
- код/ключ/секрет лежит в `Offer.hiddenData`;
- покупка или получение идет через `Transaction`;
- есть hardcoded checkout промокоды, но нет отдельной таблицы промокодов;
- нет отдельного лога "пользователь показал/скопировал промокод".

Что нужно сделать:

- либо добавить отдельную таблицу `Promocode`;
- либо расширить `Offer`, чтобы он полностью покрывал промокоды;
- добавить `codeType`, `discountValue`, `validFrom`, `validTo`;
- добавить `PromocodeActivation` или `OfferActivation`;
- сделать endpoint типа `POST /promocodes/:id/activate` или `POST /offers/:id/reveal`;
- в UI сделать нормальную кнопку "Показать код" с модалкой и копированием.

### 4. B2C кабинет

В ТЗ:

- у B2C пользователя должен быть профиль;
- баланс;
- купоны;
- избранное;
- история активаций;
- интересы;
- персональные рекомендации.

В Perkly сейчас:

- профиль уже сильный;
- баланс и Perkly Points есть;
- покупки и история есть;
- избранное есть в iOS локально;
- web profile умеет показывать купленные коды;
- интересы есть в onboarding, но сохраняются в основном локально;
- единой серверной "моей полки" пока нет.

Что нужно сделать:

- добавить server-side favorites;
- добавить историю показов/копирований промокодов;
- добавить backend для интересов пользователя;
- синхронизировать B2C кабинет между iOS, web и Telegram;
- добавить разделы: "Сохраненные", "Активированные", "История", "Интересы".

### 5. RBAC и JWT

В ТЗ:

- роли `B2C_USER` и `B2B_MERCHANT`;
- access token на 15 минут;
- refresh token на 30 дней;
- B2C не должен иметь доступ к B2B endpoints.

В Perkly сейчас:

- роли есть, но называются `USER`, `VENDOR`, `ADMIN`;
- JWT есть;
- access token живет 1 день;
- refresh token flow не реализован;
- backend закрывает seller endpoints ролями;
- UI местами показывает seller dashboard обычному пользователю.

Что нужно сделать:

- выбрать финальные названия ролей;
- добавить refresh token;
- сократить access token до 15 минут, если строго следуем ТЗ;
- скрыть seller dashboard от B2C пользователя;
- добавить тесты, что B2C получает `403` на B2B endpoints.

### 6. CDP / anonymous identity

В ТЗ:

- пользователь может сначала быть анонимным;
- его действия должны сохраняться под `anonymous_id`;
- после логина старые события должны привязаться к реальному `user_id`.

В Perkly сейчас:

- frontend и iOS уже генерируют persistent session id;
- backend пишет `AnalyticsEvent.sessionId`;
- но полноценного identity stitching пока нет.

Что нужно сделать:

- считать текущий `sessionId` как основу для `anonymousId`;
- при логине связывать `anonymousId` с пользователем;
- старые события без `userId` перепривязывать к пользователю;
- использовать эти данные для рекомендаций и Telegram-уведомлений.

### 7. QA по ТЗ

В ТЗ:

- нужны тесты миграций;
- тесты RBAC;
- тесты ИНН;
- тесты неправильных скидок;
- тесты дат;
- security tests.

В Perkly сейчас:

- есть часть backend тестов;
- есть auth rate limit tests;
- есть тесты offers pagination/geo;
- но acceptance criteria из ТЗ покрыты не полностью.

Что нужно сделать:

- добавить тест `B2C -> B2B endpoint = 403`;
- добавить тесты company application;
- добавить тест ИНН 9 цифр;
- добавить тест скидки больше 100%;
- добавить тест даты окончания в прошлом;
- добавить тест activation/reveal промокода;
- добавить тест миграций Prisma.

## Что отсутствует по ТЗ полностью или почти полностью

| Требование ТЗ | Статус в Perkly | Что реализовать |
| --- | --- | --- |
| `profiles_b2c` | Нет отдельной таблицы | Добавить `B2CProfile` |
| `companies_b2b` | Нет | Добавить `Company` |
| `inn` компании | Нет | Добавить поле и валидацию 9 цифр |
| Модерация компании | Нет | Добавить статусы и admin approval |
| `promocodes` | Нет как отдельной сущности | Добавить `Promocode` или расширить `Offer` |
| `promocode_activations` | Нет | Добавить activation/reveal log |
| `anonymous_id` в профиле | Нет | Добавить identity mapping |
| Refresh token | Нет | Добавить refresh-token flow |
| Server-side favorites | Частично, в iOS локально | Добавить таблицу/endpoint |
| Server-side interests | Почти нет | Добавить `UserInterest` |
| История копирования кодов | Нет отдельной истории | Писать в `PromocodeActivation` |
| B2B заявка компании | Нет | Добавить onboarding партнера |
| B2B dashboard по промокодам | Частично | Добавить счетчик активаций, active/expired промокоды |
| QA по acceptance criteria | Частично | Добрать интеграционные тесты |

## Что нужно реализовать в первую очередь

### P0: срочно починить текущие несостыковки

1. Web seller dashboard.
   Сейчас seller dashboard в web местами вызывает не тот API:

   - создание оффера идет через admin endpoint `/offers`;
   - продавец должен создавать через `/offers/vendor`;
   - типы ответа в seller API не совпадают с backend.

2. Скрыть B2B кабинет от обычного B2C пользователя.
   Сейчас в UI есть места, где обычный пользователь может видеть вход в seller dashboard. Backend, скорее всего, не пустит, но UX должен быть правильный: B2C должен видеть "Стать партнером".

3. Зафиксировать роли.
   Нужно решить:

   - оставить `USER/VENDOR/ADMIN`;
   - или перейти на `B2C_USER/B2B_MERCHANT/ADMIN`.

4. Добавить тесты на доступ.
   B2C пользователь не должен иметь доступ к:

   - `/seller/*`;
   - `/offers/vendor/*`;
   - B2B company endpoints.

### P1: добавить недостающую архитектуру БД

Добавить модели:

```text
B2CProfile
Company
Promocode или расширенный Offer
PromocodeActivation / OfferActivation
UserInterest
SavedOffer
```

Минимально нужные поля:

```text
B2CProfile:

- userId
- city
- birthDate или birthYear
- anonymousId

Company:

- ownerUserId
- legalName
- brandName
- inn
- status

Promocode:

- companyId
- title
- codeType
- code
- discountValue
- validFrom
- validTo
- status

PromocodeActivation:

- userId
- promocodeId
- status
- copiedAt
- usedAt
```

### P2: сделать B2B кабинет по ТЗ

Нужно реализовать:

- экран "Стать партнером";
- форму заявки компании;
- поля: legal name, brand name, INN, phone;
- проверку INN;
- статус заявки;
- admin moderation;
- создание промокода;
- список активных/истекших промокодов;
- счетчик "забрали/активировали";
- простую аналитику по промокодам.

### P3: доделать B2C кабинет по ТЗ

Нужно реализовать:

- серверное избранное;
- серверную историю кодов;
- "Мои интересы";
- "Мои купоны";
- "Сохраненные";
- "История активаций";
- синхронизацию iOS/web/Telegram;
- напоминания в Telegram о скором окончании скидки.

### P4: доделать CDP и персонализацию

Нужно реализовать:

- `anonymousId`;
- привязку анонимных событий к пользователю после логина;
- рекомендации по интересам;
- сегменты для Telegram push;
- аналитику просмотров, копирований и покупок.

## Что не трогать, потому что уже сделано на очень высоком уровне

### Telegram

Не переписывать. Это один из самых сильных блоков.

Уже есть:

- Telegram login;
- Mini App login;
- bot;
- referrals;
- gifts;
- nearby;
- profile commands;
- notifications.

Нужно только расширить:

- напоминания по сохраненным купонам;
- уведомления по интересам;
- B2B уведомления о модерации и активациях.

### Marketplace core

Не превращать весь проект обратно в простой промокодник.

Уже есть:

- escrow;
- purchases;
- gifts;
- chats;
- disputes;
- reviews;
- Apple Wallet;
- seller promotion;
- Topka.

Это выше уровня ТЗ. Нужно добавить промокодную механику рядом, а не ломать существующий marketplace.

### Геймификация

Не убирать.

Уже есть:

- Perkly Points;
- wheel;
- daily bonus;
- missions;
- referral rewards;
- squad rewards;
- tiers/subscriptions.

Это сильное отличие Perkly от обычных скидочных сервисов.

### iOS UX

Не упрощать.

Уже хорошо сделаны:

- welcome/onboarding;
- Telegram/email вход;
- интересы;
- каталог;
- профиль;
- Perkly Pass;
- nearby/map discovery;
- карточки.

Нужно только подключить эти данные к backend, чтобы они не жили локально.

## Итоговая оценка покрытия ТЗ

| Раздел ТЗ | Покрытие |
| --- | --- |
| PostgreSQL | Есть |
| Prisma schema | Есть, но структура другая |
| `users` | Есть |
| `profiles_b2c` | Нет |
| `companies_b2b` | Нет |
| `promocodes` | Частично через `Offer` |
| `promocode_activations` | Частично через `Transaction`, но это не то же самое |
| RBAC | Есть, но роли называются иначе |
| JWT | Есть, но нет refresh token |
| B2B кабинет | Частично |
| B2C кабинет | Хорошо, но не полностью по ТЗ |
| Telegram | Очень хорошо |
| CDP | Есть задел |
| Каталог/карточки | Хорошо |
| QA по ТЗ | Частично |

## Главный план

1. Не переписывать Perkly с нуля.
2. Не удалять `Offer`, `Transaction`, escrow, gifts, Topka и Telegram.
3. Добавить недостающие B2B/B2C сущности в БД.
4. Разделить два сценария:

   - промокод: показать код, скопировать, записать активацию;
   - marketplace item: купить через escrow, открыть hiddenData после оплаты.
5. Сделать B2B company onboarding.
6. Сделать server-side B2C "Моя полка".
7. Довести QA до acceptance criteria из ТЗ.

Если делать именно так, Perkly сохранит текущие сильные функции и одновременно закроет требования ТЗ.
