# PerklyApp iOS Backend Gap Plan

Цель: довести Swift/iOS приложение до актуального backend API, не смешивая это с web-фронтом.

## Статус уже закрытого

### Server-side saved offers

- Статус: готово.
- Backend: `POST /offers/:id/save`, `DELETE /offers/:id/save`, `GET /users/me/saved-offers`.
- iOS: catalog, offer detail и profile используют server-side saved offers.

### B2C profile/interests foundation

- Статус: базово готово.
- Backend: `GET/PATCH /users/me/profile`, `GET/PUT /users/me/interests`.
- iOS: onboarding отправляет `birthYear` и interests на backend, локальный fallback сохранен.

### Promocode activations

- Статус: базово готово.
- Backend: activation/copy/use/history.
- iOS: profile показывает активированные промокоды, cart применяет `promocodeActivationId`.

### Seller promocodes

- Статус: базово готово.
- Backend: list/create/status/analytics.
- iOS: seller dashboard показывает промокоды, создает STATIC/DYNAMIC, меняет статус.

## P0. B2B company onboarding в iOS

Зачем: seller dashboard должен быть связан с реальной компанией, а не просто с ролью пользователя.

Статус: готово в Swift.

Backend есть:

- `GET /companies/me`
- `POST /companies/apply`

Сделано в iOS:

- добавлен `Company` model;
- добавлен `CompaniesService`;
- seller dashboard загружает company status;
- если компании нет, показывает форму заявки;
- если статус `PENDING_MODERATION`, показывает ожидание модерации;
- если `SUSPENDED`, показывает блокировку;
- если `ACTIVE`, показывает seller tools.

Acceptance:

- пользователь без компании видит CTA "Подать заявку" - готово;
- после заявки видит статус pending - готово;
- active company открывает seller dashboard - готово;
- Swift parse проходит - готово.

## P1. B2C activation промокодов на offer/catalog

Зачем: сейчас iOS умеет использовать уже активированные промокоды, но не умеет нормально активировать доступный промокод из карточки/offer detail.

Статус: готово для offer detail.

Backend есть:

- `POST /promocodes/:id/activate`
- `GET /offers/:offerId/promocodes`

Сделано:

- добавлен backend endpoint доступных промокодов для offer;
- iOS получает и показывает доступные промокоды на offer detail;
- добавлен CTA "Активировать";
- после activation обновляется локальный activated state.

Осталось как улучшение:

- добавить промокодные бейджи в catalog cards - готово;
- после activation обновлять cart/profile activations глобально, если экраны уже открыты.

## P2. Редактирование seller-промокодов

Backend есть:

- `PATCH /promocodes/:id`

Статус: базово готово.

Сделано в iOS:

- edit sheet для title/description/code/discount/limits/offer;
- сохранение через `PATCH /promocodes/:id`;
- статус промокода сохраняется при редактировании;
- список и analytics обновляются после save.

Осталось как улучшение:

- validFrom/validTo date pickers - готово;
- отдельное поле status внутри edit sheet.

## P3. Profile settings для B2C profile/interests

Backend есть:

- `GET/PATCH /users/me/profile`
- `GET/PUT /users/me/interests`

Статус: готово.

Сделано в iOS:

- экран редактирования city/gender/birthYear;
- экран редактирования interests;
- загрузка текущих значений с backend;
- сохранение изменений через backend.

## P4. Apple Wallet UI

Backend/iOS service есть:

- `GET /wallet/transactions/:id.pkpass`

Статус: уже реализовано.

Есть в iOS:

- кнопка "Добавить в Apple Wallet" в active purchases;
- скачивание `.pkpass`;
- PassKit presentation;
- обработка ошибок сертификатов/401/повторного добавления.

Осталось:

- проверить на реальном устройстве, потому simulator не всегда полноценно работает с Wallet.

## P5. Полная проверка сборки

Сейчас:

- `xcrun swiftc -parse` проходит по измененным Swift-файлам.
- Полный `xcodebuild` заблокирован локальным Xcode SDK/runtime mismatch.

Нужно:

- установить совместимый iOS Simulator runtime;
- прогнать полный build;
- проверить login, saved, cart promocode, seller promocode, company apply.
