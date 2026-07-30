# Perkly iOS: App Privacy answers and data map

Актуальность code audit: 16 июля 2026 года.

Это технически обоснованный draft для App Store Connect. Финальный ответ утверждает Account Holder после сверки production-конфигурации, договоров с провайдерами и privacy policy.

Официальная терминология:

- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/

## Верхнеуровневые ответы

### Does this app collect data?

```text
Yes
```

Perkly передаёт и хранит данные аккаунта, покупки, пользовательский контент, analytics, diagnostics, device identifier и часть location data.

### Is data used for tracking?

```text
No
```

Основание:

- IDFA и `AdSupport` не найдены;
- `AppTrackingTransparency` не используется;
- рекламные SDK не найдены;
- код не показывает cross-app/cross-site advertising measurement.

Ответ `No` остаётся верным только если production не:

- объединяет Perkly data с third-party data для рекламы;
- передаёт данные data broker;
- использует Google Sheets, Telegram или другие выгрузки для таргетированного маркетинга без отдельного disclosure/consent.

## Рекомендуемые data types

Все перечисленные типы считать `Linked to the User`, потому что запросы выполняются с account token, user ID, device ID или могут быть связаны с аккаунтом. Для всех типов: `Used for Tracking = No`.

| App Privacy data type | Что есть в Perkly | Purpose |
| --- | --- | --- |
| Contact Info → Name | `displayName`, Apple/Telegram name, company owner name | App Functionality; Product Personalization |
| Contact Info → Email Address | email login, Apple email, password reset | App Functionality |
| Contact Info → Phone Number | Telegram phone login, company contact phone | App Functionality |
| Location → Precise Location | точные `lat/lng` уходят в feed/catalog/recommendations API | App Functionality; Product Personalization |
| Financial Info → Other Financial Info | внутренний UZS balance, deposits, financial ledger | App Functionality |
| Purchases → Purchase History | offers, transaction status, gifts, subscriptions, promocode use | App Functionality; Product Personalization |
| User Content → Photos or Videos | seller offer images, Topka media, Telegram avatar URL | App Functionality |
| User Content → Emails or Text Messages | private chat messages между пользователями/поддержкой | App Functionality |
| User Content → Customer Support | support chats, disputes, reports, appeals | App Functionality |
| User Content → Other User Content | reviews, seller offers, events, free-form descriptions, codes/instructions | App Functionality |
| Search History → Search History | catalog query отправляется API и analytics metadata | Analytics; Product Personalization; App Functionality |
| Identifiers → User ID | account UUID, Telegram ID, Apple subject, session ID | App Functionality; Analytics |
| Identifiers → Device ID | persistent generated UUID, APNs token | App Functionality; Analytics |
| Usage Data → Product Interaction | app open, offer view/click, cart, category, recommendation, bonus and wheel events | Analytics; Product Personalization |
| Diagnostics → Crash Data | uncaught exception and unexpected-exit reports | App Functionality; Analytics |
| Diagnostics → Performance Data | hang watchdog and occurrences | App Functionality; Analytics |
| Diagnostics → Other Diagnostic Data | app version, OS version, device class, breadcrumbs | App Functionality; Analytics |
| Other Data → Other Data Types | birth year, gender, city, declared interests, notification preferences | Product Personalization; App Functionality |

## Data types, которые сейчас не нужно выбирать

| Type | Причина |
| --- | --- |
| Payment Info | Карта вводится на странице платёжного провайдера, а Perkly code не получает номер карты или банковский счёт. Если Click передаёт эти данные Perkly по другому каналу, ответ нужно изменить. |
| Credit Info | Не найдено. |
| Physical Address | Адреса заведений/events — данные контента, а не домашний адрес пользователя. |
| Contacts | Address Book/Contacts framework не используется. |
| Health / Fitness | Не найдено. |
| Audio Data | Запись/загрузка голоса не найдена. |
| Browsing History | Приложение не собирает историю внешних сайтов. |
| Advertising Data | Рекламный SDK и impression-level ads data не найдены. |
| Environment Scanning | ARKit использует окружение на устройстве; mesh/planes/images не отправляются на backend. Если это изменится, disclosure обязателен. |
| Sensitive Info | Текущий профиль содержит birth year, gender, city и interests, которые здесь учтены как Other Data Types. Legal/privacy owner должен отдельно подтвердить классификацию для рынков распространения. |
| Biometric Data | Face ID обрабатывается системным `LocalAuthentication`; biometric template не получает и не хранит Perkly. |

## Code evidence

| Область | Источник |
| --- | --- |
| Account/profile fields | `PerklyApp/Models/User.swift`, backend `prisma/schema.prisma` |
| Apple/Telegram auth | `PerklyApp/Services/AuthService.swift`, `Views/Auth/LoginView.swift` |
| Device UUID/name | `PerklyApp/Services/APIClient.swift` |
| APNs token | `PerklyApp/AppDelegate.swift`, `NotificationsService.swift` |
| Precise location upload | `HomeFeedService.swift`, `OfferFilters`, `CatalogViewModel.swift` |
| Analytics | `PerklyApp/Services/AnalyticsService.swift`, backend `analytics.service.ts` |
| Diagnostics | `PerklyApp/PerklyApp.swift`, backend `DiagnosticIssue` |
| Purchases/deposits/ledger | `TransactionsService.swift`, `PaymentsService.swift`, Prisma models |
| Chats/reviews/disputes | соответствующие iOS services и Prisma models |
| Image upload | `OffersService.uploadVendorImage`, `PhotosPicker` seller flows |
| Export/delete | `UsersService.exportPersonalData`, `UsersService.deleteAccount` |

## Third-party and processor review

Перед App Privacy publication подтвердить реальную production-конфигурацию:

| Partner/service | Какие данные могут получить | Что проверить |
| --- | --- | --- |
| Click | deposit ID, amount, user/payment reference; payment data на стороне provider | DPA/terms, retention, webhook fields, отсутствие card data у Perkly |
| Telegram | Telegram ID, phone/name during login; notifications; admin new-user message | Явный disclosure, необходимость admin notification, bot privacy notice |
| Apple | Sign in with Apple, APNs, Wallet | Apple frameworks; данные, собираемые самой Apple, Perkly не декларирует за Apple |
| Hosting/PostgreSQL/Redis | account and service data | Processor contract, region, backups, access controls |
| S3/CDN | uploaded offer/event images and delivery logs | Bucket privacy, retention, deletion, CDN logs |
| Google Sheets webhook | name, email, phone, Telegram ID, registration date, user ID | Условный код есть; отключить либо явно обосновать и раскрыть |
| Admin Telegram notification | name, email, phone, Telegram ID, user ID | Минимизировать; персональные данные не должны уходить в личный чат без legal basis |

## Privacy policy gaps

Текущая web policy слишком общая для фактического кода. До публикации добавить:

- юридическое имя и контакты data controller;
- полный список категорий данных;
- точные purposes и legal basis;
- processors/категории recipients;
- трансграничную передачу и места хранения;
- retention по аккаунту, сообщениям, analytics, diagnostics, ledger и backups;
- правила Telegram/Click/S3/CDN;
- обработку precise/background location;
- права на export, correction, deletion и appeal;
- обработку данных несовершеннолетних;
- версию и дату вступления в силу;
- рабочий privacy contact.

`https://perkly.uz/privacy` на дату аудита возвращает 404.

## Privacy manifests

Созданы и проходят `plutil -lint`:

- `PerklyApp/PrivacyInfo.xcprivacy`;
- `PerklyWidgets/PrivacyInfo.xcprivacy`.

App manifest уже содержит:

- `NSPrivacyTracking = false`;
- пустой `NSPrivacyTrackingDomains`;
- `NSPrivacyAccessedAPICategoryUserDefaults` с reasons `CA92.1` и `1C8F.1`;
- name, email, phone, precise location, purchase history, user/device IDs, product interaction, user content, customer support, photos/videos, crash и performance data.

Widget manifest содержит:

- `NSPrivacyTracking = false`;
- `NSPrivacyAccessedAPICategoryUserDefaults` с reason `1C8F.1`;
- отсутствие collected data types.

Оба manifest-файла добавлены в соответствующие PBX Resources phases. До upload остаётся:

- убедиться, что они действительно попали в app/widget Release archive;
- сгенерировать Xcode Privacy Report;
- проверить остальные required-reason APIs по итоговому archive;
- сверить manifest с App Store Connect и production processors;
- решить, нужно ли добавить в manifest отдельные категории Search History, Emails or Text Messages, Other Financial Info и Other Diagnostic Data, которые присутствуют в общей data map.

Официальные источники:

- https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
- https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api

## Export compliance

Код использует:

- `URLSession`/HTTPS;
- CryptoKit SHA-256 для Sign in with Apple nonce;
- Keychain/LocalAuthentication.

Собственная или нестандартная encryption implementation не найдена. Предварительный ответ: приложение использует только exempt encryption, предоставленную Apple OS, и cryptographic hashing.

После проверки всех linked libraries code-side значение уже установлено:

```text
ITSAppUsesNonExemptEncryption = NO
```

`ITSAppUsesNonExemptEncryption = false` находится в `PerklyApp/Info.plist`. Account Holder всё равно должен подтвердить, что итоговый archive не добавил non-exempt encryption library и что выбранная классификация корректна.

Окончательное export-compliance утверждение делает Account Holder; это не юридическое заключение.

Источник:

- https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption
