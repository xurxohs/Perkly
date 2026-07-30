# Perkly Product Docs

Это главный индекс по продуктовым документам Perkly. Все `.md` документы теперь лежат в одной папке:

```text
PerklyApp/ProductDocs
```

Индекс можно использовать как карту: что показывать инвестору, что давать бизнесу, чем проверять iOS-релиз и как проводить демо.

## Что уже собрано

| Документ | Для чего нужен |
| --- | --- |
| `INVESTOR_PRODUCT_ONE_PAGER.md` | Короткое объяснение Perkly для инвестора, партнёра или питча. |
| `THREE_DAY_PROGRESS_INFOGRAPHIC.md` | Инфографика: что добавили и улучшили за последние 3 дня. |
| `ARCHITECTURE_MAP.md` | Карта архитектуры: iOS/Web/Telegram -> API -> PostgreSQL, B2B/B2C связи. |
| `DEMO_SCRIPT_3_MIN.md` | Сценарий 3-минутного демо продукта. |
| `MERCHANT_PITCH.md` | Текст для бизнеса: зачем продавцу подключаться к Perkly. |
| `IOS_LAUNCH_CHECKLIST.md` | Чеклист перед TestFlight/App Store. |
| `IOS_QA_MATRIX.md` | Таблица ручного тестирования iOS-приложения. |
| `USER_ONBOARDING_COPY.md` | Готовые тексты для onboarding в iOS. |
| `RISK_REGISTER.md` | Таблица рисков и что делать, чтобы их снизить. |
| `IOS_BACKEND_GAP_PLAN.md` | Что уже синхронизировано между iOS и backend, что осталось. |
| `PROJECT_DEEP_ANALYSIS.md` | Глубокий анализ проекта и оставшихся зон. |
| `TZ_GAP_ANALYSIS.md` | Анализ проекта по ТЗ: что есть, чего нет, что добавить. |
| `TZ_INFOGRAPHIC_PROMPT.md` | Текст/структура для инфографики по ТЗ. |
| `WELCOME_SCREEN_PLAN.md` | План welcome/onboarding screen в iOS. |
| `APP_STORE_SUBMISSION_PACK.md` | Главная карта готовности App Store и выявленные submission blockers. |
| `APP_STORE_METADATA_RU.md` | Русская App Store metadata с проверенными лимитами и URL. |
| `APP_STORE_METADATA_UZ_LATN.md` | Узбекская Latin copy и ограничения её использования в App Store Connect. |
| `APP_STORE_METADATA_EN_GB.md` | English (U.K.) metadata для storefront Узбекистана. |
| `APP_PRIVACY_DISCLOSURE.md` | App Privacy answers, data map, processors и privacy-manifest checklist. |
| `APP_REVIEW_NOTES.md` | Проверяемый шаблон App Review Notes и reviewer flow. |
| `APP_STORE_SCREENSHOT_CAPTURE_PLAN.md` | Матрица реальных iPhone/iPad screenshots без fake UI. |
| `APP_STORE_RELEASE_CHECKLIST.md` | Финальный App Store, production deploy и post-release checklist. |

## Как использовать

1. Для быстрого отчёта открыть `THREE_DAY_PROGRESS_INFOGRAPHIC.md`.
2. Для инвестора или партнёра открыть `INVESTOR_PRODUCT_ONE_PAGER.md`.
3. Для живого показа продукта идти по `DEMO_SCRIPT_3_MIN.md`.
4. Для объяснения технической логики показать `ARCHITECTURE_MAP.md`.
5. Для подготовки релиза использовать `IOS_LAUNCH_CHECKLIST.md` и `IOS_QA_MATRIX.md`.
6. Перед релизным решением пройти `RISK_REGISTER.md`.
7. Для сверки с ТЗ открыть `TZ_GAP_ANALYSIS.md`.

## Короткий вывод

Perkly уже выглядит не как простой каталог скидок, а как B2B/B2C платформа: есть пользовательская сторона, бизнес-сторона, промокоды, сохранённые офферы, покупки, company flow, seller tools и backend-синхронизация с iOS.
