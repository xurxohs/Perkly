# Perkly iOS: QA matrix

Использовать во время ручного тестирования на симуляторе или реальном iPhone.

## Легенда

```text
TODO     ещё не проверено
PASS     работает как ожидается
FAIL     найден баг
BLOCKED  нельзя проверить из-за окружения, аккаунта или API
```

## Auth

| Экран | Сценарий | Ожидаемый результат | Статус | Заметки |
| --- | --- | --- | --- | --- |
| Welcome | Открыть app без токена | Показан auth entry | TODO | |
| Login | Валидные email/password | Пользователь вошёл | TODO | |
| Login | Неверный password | Показана понятная ошибка | TODO | |
| Register | Новый аккаунт | Аккаунт создан, сессия сохранена | TODO | |
| Session | Перезапустить app | Пользователь восстановлен из Keychain | TODO | |
| Logout | Нажать logout | Токен очищен | TODO | |

## Catalog

| Экран | Сценарий | Ожидаемый результат | Статус | Заметки |
| --- | --- | --- | --- | --- |
| Catalog | Load offers | Офферы отображаются | TODO | |
| Catalog | Search | Results обновляются | TODO | |
| Catalog | Save offer | Heart заполняется, backend сохраняет | TODO | |
| Catalog | Unsave offer | Heart очищается, backend удаляет | TODO | |
| Catalog | Offer with active promo | Promo badge виден | TODO | |
| Catalog | Nearby | Location-based offers отображаются | TODO | |

## Offer Detail

| Экран | Сценарий | Ожидаемый результат | Статус | Заметки |
| --- | --- | --- | --- | --- |
| Detail | Open offer | Data/reviews/recommendations загружаются | TODO | |
| Detail | Save/unsave | Backend state обновляется | TODO | |
| Detail | Available promos | Promo block появляется | TODO | |
| Detail | Activate promo | Activation создана | TODO | |
| Detail | Add to cart | Item появляется в cart | TODO | |
| Detail | Buy now | Transaction создана | TODO | |

## Cart

| Экран | Сценарий | Ожидаемый результат | Статус | Заметки |
| --- | --- | --- | --- | --- |
| Cart | Open with items | Items отображаются | TODO | |
| Cart | Select activated promo | Discount показан | TODO | |
| Cart | Checkout with promo | `promocodeActivationId` отправлен | TODO | |
| Cart | Checkout with points | Points discount применён | TODO | |
| Cart | Gift toggle | Gift flag отправлен | TODO | |

## Profile

| Экран | Сценарий | Ожидаемый результат | Статус | Заметки |
| --- | --- | --- | --- | --- |
| Profile | Load | Stats/saved/promos загружаются | TODO | |
| Profile | Saved offers | Server-side saved offers показаны | TODO | |
| Profile | Remove saved | Offer удалён | TODO | |
| Profile | Promocode copy | Code скопирован, status обновлён | TODO | |
| Profile | Promocode use | Status становится used | TODO | |
| Profile | Edit basic profile | Name/avatar обновляются | TODO | |
| Profile | Personalization | B2C profile/interests загружаются | TODO | |
| Profile | Save personalization | Backend обновляется | TODO | |

## Seller

| Экран | Сценарий | Ожидаемый результат | Статус | Заметки |
| --- | --- | --- | --- | --- |
| Seller | No company | Apply gate появляется | TODO | |
| Seller | Apply company | Pending status появляется | TODO | |
| Seller | Pending company | Seller tools locked | TODO | |
| Seller | Active company | Seller tools видны | TODO | |
| Seller | Create offer | Offer появляется | TODO | |
| Seller | Edit offer | Offer обновляется | TODO | |
| Seller | Create promocode | Promo появляется | TODO | |
| Seller | Edit promocode | Promo обновляется | TODO | |
| Seller | Pause/archive promo | Status обновляется | TODO | |
| Seller | validFrom/validTo | Dates сохраняются | TODO | |

## Wallet

| Экран | Сценарий | Ожидаемый результат | Статус | Заметки |
| --- | --- | --- | --- | --- |
| Active purchase | Wallet button visible | Button показан для подходящей transaction | TODO | |
| Wallet | Add pass | PassKit открывается | TODO | Нужен реальный iPhone |
| Wallet | Already added | Показано понятное сообщение | TODO | |
| Wallet | Cert missing | Показана понятная ошибка | TODO | |

## Push & Location

| Экран | Сценарий | Ожидаемый результат | Статус | Заметки |
| --- | --- | --- | --- | --- |
| Permissions | Enable location | Permission prompt появляется | TODO | |
| Nearby | Location granted | Nearby offers обновляются | TODO | |
| Push | APNS token | Token отправлен в backend | TODO | |
| Geofence | Enter region | Notification появляется | TODO | |

## Проверки Admin/Web зависимости

| Область | Сценарий | Ожидаемый результат | Статус | Заметки |
| --- | --- | --- | --- | --- |
| Admin web | Approve company | iOS seller unlocks | TODO | |
| Backend | Promo endpoints | 401 без токена, 200 с токеном | TODO | |
| Backend | Offer promo count | `_count.promocodes` returned | PASS | Production checked |
