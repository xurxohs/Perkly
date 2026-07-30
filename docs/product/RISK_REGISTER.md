# Perkly: risk register

## Матрица рисков

```text
Impact:     Low / Medium / High
Likelihood: Low / Medium / High
```

| Риск | Impact | Likelihood | Что делать | Владелец |
| --- | --- | --- | --- | --- |
| Payment failure | High | Medium | Понятные статусы transaction, retry, ручной support flow | Backend |
| Mock payment leak to production | High | Low | Production guard уже добавлен, держать тесты | Backend |
| Apple Wallet certs missing | Medium | Medium | Detect 503, понятный UI, checklist сертификатов | Backend/iOS |
| Fake sellers | High | Medium | Company moderation, INN validation, admin review | Admin |
| Promo abuse | High | Medium | Per-user limits, max activations, pause/archive status | Backend |
| Promo code leakage | Medium | Medium | Activation ownership, code snapshot, показывать код только когда можно | Backend |
| Data privacy issues | High | Medium | Минимум данных профиля, privacy policy, secure tokens | Product/Backend |
| JWT token stolen | High | Medium | Refresh tokens, short access token, session revoke | Backend/iOS |
| iOS build blocked | Medium | High | Установить совместимый simulator runtime, тестировать на устройстве | iOS |
| Backend/web drift from iOS | Medium | Medium | API matrix и QA matrix | Product |
| Seller analytics incorrect | Medium | Medium | Transaction attribution tests, analytics tests | Backend |
| Company status mismatch | Medium | Low | Всегда gate seller tools через `/companies/me` | iOS/Backend |
| Push notification issues | Low | Medium | APNS token logging, fallback in-app states | iOS |
| Location permission rejection | Low | High | App работает без location, объяснить nearby value | iOS |
| App Store rejection | High | Medium | Privacy labels, test account, no hidden dev endpoints | Product |

## Самые важные риски

### 1. Полная iOS-сборка заблокирована

Текущая проблема:

```text
Xcode SDK/runtime mismatch
```

Что делать:

- установить совместимый iOS Simulator runtime;
- прогнать полный `xcodebuild`;
- проверить приложение на реальном iPhone.

### 2. Платежи и доверие к покупке

Риск:

- ошибка платежа или непонятный статус transaction быстро ломают доверие пользователя.

Что делать:

- показывать понятные статусы: pending, paid, escrow, completed, failed;
- держать видимым support/dispute flow;
- не допускать production mock payment behavior.

### 3. Злоупотребление промокодами

Риск:

- пользователи могут переиспользовать или массово распространять промокоды.

Что уже добавлено:

- `maxActivations`;
- `perUserLimit`;
- ownership активации;
- проверки статуса;
- перевод activation в used после checkout.

Что добавить дальше:

- rate limits на activation/copy/use;
- anomaly detection;
- merchant-level abuse reports.

### 4. Фейковые продавцы

Риск:

- слабые или фейковые бизнесы могут публиковать офферы.

Что уже добавлено:

- company application;
- INN validation;
- company statuses;
- seller gate в iOS.

Что добавить дальше:

- document upload;
- admin checklist;
- seller reputation score.

### 5. Приватность данных

Риск:

- B2C profile/interests требуют понятного объяснения пользователю: какие данные собираются и зачем.

Что делать:

- собирать только минимально нужные данные;
- дать пользователю возможность редактировать профиль и интересы;
- объяснить ценность персонализации в onboarding;
- подготовить privacy policy.

## Релизный контроль

Перед релизом должно быть так:

- нет критичных backend vulnerabilities в production dependencies;
- нет dev-only payment path в production;
- полный iOS build проходит;
- manual QA matrix закрыта;
- App Store privacy data подготовлена;
- payment и Wallet flows проверены.
