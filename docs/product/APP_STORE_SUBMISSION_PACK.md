# Perkly iOS: App Store submission pack

Актуальность аудита: 16 июля 2026 года.

Этот комплект подготовлен по фактическому состоянию iOS- и backend-кода. Он не содержит сгенерированных или постановочных скриншотов, выдуманных тестовых аккаунтов, контактов и платёжных обещаний.

## Файлы комплекта

| Файл | Назначение |
| --- | --- |
| `APP_STORE_METADATA_RU.md` | Готовая русская metadata: subtitle, promotional text, keywords, description, URLs и What's New. |
| `APP_STORE_METADATA_UZ_LATN.md` | Узбекская Latin copy и правила её использования с учётом ограничений App Store Connect. |
| `APP_STORE_METADATA_EN_GB.md` | Обязательная English (U.K.) metadata для storefront Узбекистана. |
| `APP_PRIVACY_DISCLOSURE.md` | Предлагаемые ответы App Privacy, карта данных и privacy-manifest checklist. |
| `APP_REVIEW_NOTES.md` | Проверяемый шаблон App Review Notes и сценарий ревью. |
| `APP_STORE_SCREENSHOT_CAPTURE_PLAN.md` | Матрица реальных экранов и обязательных размеров iPhone/iPad. |
| `APP_STORE_RELEASE_CHECKLIST.md` | Финальный release gate: App Store, backend, deploy и post-release monitoring. |

## Проверенные факты о текущем target

| Параметр | Текущее значение | Вывод |
| --- | --- | --- |
| App name | `Perkly` | Готово как рабочее название; доступность имени проверяется в App Store Connect. |
| Version / build | `1.0` / `1` | Для первой загрузки допустимо; перед новой загрузкой build должен увеличиваться. |
| Category in Xcode | Shopping | Primary category в App Store Connect должна совпадать. |
| Minimum OS | iOS 17.0 | Нужно явно указать на странице поддержки. |
| Devices | iPhone + iPad (`TARGETED_DEVICE_FAMILY = "1,2"`) | Обязательны iPhone- и iPad-скриншоты. |
| Release API | `https://perkly.uz/api` | Production endpoint задан в `Constants.swift`. |
| Release bundle ID | `com.perkly.app` | Production identifier задан в pbx и `project.yml`; Debug сохраняет `com.perkly.app.dev`. |
| Widget bundle ID | `com.perkly.app.widgets` | Production widget identifier задан; Debug сохраняет `.dev.widgets`. |
| Sign in with Apple | Есть в UI и entitlements | Требует рабочей платной Team, App ID и backend configuration. |
| Push Notifications | Есть в entitlements и коде | Требует APNs capability и production token test. |
| App Group | `group.com.perkly.app` | Должен быть зарегистрирован для app и widget. |
| Privacy manifests | Созданы, валидны и добавлены в Resources phases app + widget | До upload остаются проверка итогового archive и Xcode Privacy Report. |
| ATS | `NSAllowsArbitraryLoads` удалён из pbx и `project.yml` | Code-level настройка закрыта; HTTPS проверяется в итоговом Release archive и runtime. |
| Export compliance key | `ITSAppUsesNonExemptEncryption = false` | Code-side declaration добавлена; Account Holder всё равно подтверждает классификацию при submission. |
| App languages | Добавлены `ru` и `uz`, `Localizable.strings`, `InfoPlist.strings` и `developmentRegion = ru` | Локализация существенно расширена; key parity, остаточные fallback и layout всё ещё проходят доработку и ручную проверку. |
| Staging image delivery | Staging S3/CDN подготовлен | Production credentials, upload/delete flow и CDN delivery ещё проходят отдельный release gate. |

## Что можно вставлять в App Store Connect

- Русскую metadata можно добавить как Russian localization.
- Узбекская Latin copy подготовлена как продуктовый master для расширяемой локализации приложения, сайта и креативов.
- App Store Connect на дату аудита не поддерживает Uzbek metadata localization. Для storefront Узбекистана Apple указывает English (U.K.) как default language. Поэтому подготовлена отдельная `APP_STORE_METADATA_EN_GB.md`; нельзя выдавать Uzbek copy за English localization.

Официальный список локализаций и storefront mapping:

- https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations/

## Текущий статус публичных URL

Проверено 16 июля 2026 года:

| URL | HTTP | Статус для App Review |
| --- | --- | --- |
| `https://perkly.uz` | 200 | Можно использовать как Marketing URL. |
| `https://perkly.uz/privacy` | 404 | Блокирует submission: Privacy Policy URL обязателен. |
| `https://perkly.uz/terms` | 404 | Ссылка из iOS ведёт на несуществующую страницу. |
| `https://perkly.uz/support` | 404 | Frontend page уже создана и локально собирается, но production deploy ещё не выполнен. |
| `https://t.me/perkly_support` | 200 | Рабочий дополнительный канал, но не замена полноценной support page. |

Страницы `/privacy`, `/terms` и `/support` существуют в web source, но текущий production их не отдаёт. Перед submission их необходимо реально развернуть и проверить извне.

## Главные release blockers

### 1. Платежи за цифровые товары

Текущий каталог прямо предлагает цифровые товары, подписки, коды, ссылки и доступы, а пополнение идёт через Click. По App Review Guideline 3.1.1 цифровые товары, подписки, цифровые ваучеры и функции, потребляемые в приложении, обычно должны использовать In-App Purchase.

Внешний платёж допустим для физических товаров и услуг, потребляемых вне приложения, по Guideline 3.1.3(e). До submission нужен один честный вариант:

1. StoreKit/IAP для цифровых товаров и цифровых подписок; либо
2. iOS-каталог только физических товаров/офлайн-услуг, а цифровые покупки и внутренние подписки отключены в iOS build; либо
3. подтверждённый Apple entitlement/региональный сценарий, который действительно применим к Perkly.

Нельзя скрывать цифровой checkout от reviewer или описывать его как физический, пока код ведёт себя иначе.

Официальные правила:

- https://developer.apple.com/app-store/review/guidelines/#payments

### 2. User-generated content

В коде теперь реализованы основные технические требования Guideline 1.2:

- server-side content filter для chat messages, reviews, seller offers и events;
- report action из direct chat и backend moderation queue;
- block/unblock API, скрытие direct rooms и запрет новых сообщений между заблокированными пользователями;
- iOS action `Пожаловаться` / `Заблокировать` в меню direct chat.

До submission остаются ручная E2E-проверка, проверка admin moderation SLA, опубликованные support contacts и проверка того, что пользовательский блок работает на реальном production build.

- https://developer.apple.com/app-store/review/guidelines/#user-generated-content

### 3. Privacy и третьи стороны

Backend может отправлять сведения о новом пользователе администратору в Telegram и в `GOOGLE_SHEETS_WEBHOOK_URL`. Это должно быть:

- действительно необходимо;
- отражено в privacy policy и App Privacy;
- ограничено production-конфигурацией;
- согласовано с пользователем и применимым законодательством.

Подробности находятся в `APP_PRIVACY_DISCLOSURE.md`.

## Официальные лимиты metadata

| Поле | Лимит |
| --- | --- |
| App name | 30 символов |
| Subtitle | 30 символов |
| Promotional text | 170 символов |
| Description | 4000 символов |
| Keywords | 100 bytes |
| Screenshots | 1–10 на device size/localization |

Источники:

- https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/
- https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/

## Правило использования комплекта

Metadata считается готовой к вставке только после того, как все пункты `P0` в `APP_STORE_RELEASE_CHECKLIST.md` закрыты фактами. Квадратные placeholders нельзя отправлять в App Review.
