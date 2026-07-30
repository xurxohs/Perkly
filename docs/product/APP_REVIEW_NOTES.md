# Perkly iOS: App Review Notes

Статус: шаблон готов. Не отправлять Apple, пока placeholders и payment section не заменены проверенными фактами.

Review Notes лучше подавать на английском, чтобы не создавать задержку на стороне reviewer.

## Required review account

Apple требует полный доступ к account-based functionality. Нельзя придумывать учётные данные в metadata.

До submission создать отдельный production review account:

```text
Email: [REQUIRED: permanent App Review email]
Password: [REQUIRED: permanent App Review password]
```

Требования к аккаунту:

- не истекает во время review;
- email verification/2FA не блокируют reviewer;
- баланс заранее пополнен тестовыми UZS без реального списания с reviewer;
- есть сохранённый offer;
- есть одна активная и одна завершённая purchase;
- есть доступный chat/support room;
- нет реальных персональных данных другого пользователя;
- продавец и контент созданы специально для review и ясно подписаны как review data, а не как недоступный «demo mode».

Если reviewer должен проверить seller flow, добавить отдельный active-company account:

```text
Seller email: [REQUIRED]
Seller password: [REQUIRED]
```

Admin credentials Apple не передавать, если admin UI не является пользовательской функцией релизного build.

## Base review note

Скопировать и заполнить только после закрытия blockers:

```text
Perkly is a marketplace for offers available to users in Uzbekistan. Prices in the app are displayed in Uzbek soum (UZS).

REVIEW ACCOUNT
Email: [REQUIRED]
Password: [REQUIRED]

The production API used by this build is https://perkly.uz/api. The backend and the review account will remain available throughout the review.

CORE REVIEW FLOW
1. Sign in with the review account.
2. Open Catalog from the bottom tab bar.
3. Open the offer named “[REQUIRED: exact offer title]”.
4. Save or unsave it using the heart button.
5. Follow the purchase flow described in the PAYMENT MODEL section below.
6. Open Profile → Purchases to inspect the active and completed transactions.
7. Open the purchase chat and the dispute/support entry points.

ACCOUNT DELETION
Profile → Settings → Session → Delete Account.
The app requests the current password when the account has one and requires the confirmation word shown on screen.

OPTIONAL PERMISSIONS
Location is used to show nearby offers and, only after separate Always authorization, nearby alerts. The catalog remains usable when location is denied.
Camera access is requested only when the user opens AR discovery.
Notifications are used for purchases, messages, nearby offers, and account security.
Face ID is optional and only protects local access to the signed-in app.

USER-GENERATED CONTENT
In a direct chat, tap the ellipsis button in the top-right corner and choose Report or Block.
The server filters objectionable language and excessive links before writing chat messages, reviews, seller offers, and events.
Reports enter the moderation queue with OPEN, REVIEWING, RESOLVED, or REJECTED status.
Moderation response target: [REQUIRED: factual response SLA].

SUPPORT
Support URL: https://perkly.uz/support
Support email: [REQUIRED: verified mailbox]
Telegram: https://t.me/perkly_support

NOTES
Sign in with Apple and email/password are supported. Telegram sign-in opens the official Telegram flow.
The app does not use advertising tracking or the advertising identifier.
```

## Payment model — mandatory decision

Нельзя вставлять обе версии. Выбрать только ту, которая полностью соответствует shipped binary и business model.

### Variant A — StoreKit for digital goods

Использовать только после реальной интеграции IAP:

```text
PAYMENT MODEL
Digital goods and subscriptions available in the iOS app use Apple In-App Purchase. Restorable purchases can be restored from [REQUIRED: exact path].
Offers for physical goods or services consumed outside the app may use the external payment provider shown in the checkout.
The review account includes [REQUIRED: product IDs or a review-safe flow].
```

### Variant B — only physical/offline goods in iOS

Использовать только если цифровой catalog/checkout и internal subscriptions фактически отключены:

```text
PAYMENT MODEL
The iOS app only sells vouchers or services redeemed for physical goods or services outside the app. Digital goods, digital subscriptions, account feature unlocks, and digital gift cards are not sold in this iOS build.
The external payment provider is used only for those outside-the-app goods and services.
The reviewer is not required to make a real payment. The pre-funded review account can complete the review offer “[REQUIRED]”.
```

### Current code is not ready for either statement

Сейчас iOS прямо показывает:

- цифровые товары и подписки;
- purchase of code/link/login/instructions;
- Click top-up;
- internal subscription tiers;
- gift codes and purchased access.

До исправления это высокий риск rejection по Guideline 3.1.1:

- https://developer.apple.com/app-store/review/guidelines/#payments

## Review attachments

Перед submission подготовить:

- короткое screen recording core flow;
- exact review offer ID/title;
- test gift/redeem code, если reviewer должен его проверить;
- пояснение escrow/transaction statuses;
- подтверждение прав на offer/event images;
- если Apple Wallet включён — валидный pass, issuer contact и dedicated certificate;
- если feature недоступна в review region/account — честное объяснение, а не скрытие.

## App Review contact

Заполнить в App Store Connect реальными данными человека, который отвечает во время review:

```text
First name: [REQUIRED]
Last name: [REQUIRED]
Phone: [REQUIRED, reachable with country code]
Email: [REQUIRED, monitored daily]
```

## Final self-check

- ни одного `[REQUIRED]` не осталось;
- review account проверен на чистом iPhone;
- backend отвечает из внешней сети;
- reviewer не должен платить личными деньгами;
- exact navigation paths совпадают с final build;
- notes не описывают функцию, которой нет;
- payment explanation однозначен;
- UGC block/report/filter проверены вручную на final production build;
- moderation response SLA заменил placeholder и подтверждён операционной командой.
