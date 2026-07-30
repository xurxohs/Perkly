# Perkly iOS: launch checklist

Цель: проверить PerklyApp перед реальным тестом на устройстве, TestFlight или App Store.

## 1. Сборка и окружение

| Проверка | Ожидаемый результат | Статус |
| --- | --- | --- |
| Xcode components installed | Установлен совместимый iOS Simulator runtime | TODO |
| Full `xcodebuild` | Сборка проходит без ошибок | TODO |
| Swift parse | Синтаксических ошибок нет | DONE |
| API base URL | Указывает на production/staging правильно | TODO |
| App icon | Иконка отображается корректно | TODO |
| Launch screen | Нет пустого или неправильного экрана | TODO |

## 2. Auth

| Сценарий | Ожидаемый результат | Статус |
| --- | --- | --- |
| Register with email | Аккаунт создан, пользователь вошёл в приложение | TODO |
| Login with email | Пользователь попадает в приложение | TODO |
| Restore session | Токен из Keychain восстанавливает сессию | TODO |
| Logout | Токен очищен, пользователь возвращается к auth | TODO |
| Telegram auth | Login проходит или показывает понятную ошибку | TODO |

## 3. Profile

| Сценарий | Ожидаемый результат | Статус |
| --- | --- | --- |
| Open profile | Загружаются статистика, баланс, saved offers | TODO |
| Edit display name/avatar | Backend обновляет пользователя | TODO |
| Open personalization | Загружаются текущий профиль и интересы | TODO |
| Save city/gender/birthYear | Backend обновляет `B2CProfile` | TODO |
| Save interests | Backend обновляет `UserInterest` | TODO |

## 4. Saved Offers

| Сценарий | Ожидаемый результат | Статус |
| --- | --- | --- |
| Save from catalog | Сердце меняется, backend сохраняет оффер | TODO |
| Unsave from catalog | Сердце меняется, backend удаляет saved offer | TODO |
| Save from offer detail | Saved state обновляется | TODO |
| Profile saved list | Saved offers отображаются | TODO |
| Remove saved from profile | Оффер удаляется из backend и UI | TODO |

## 5. Promocodes

| Сценарий | Ожидаемый результат | Статус |
| --- | --- | --- |
| Offer detail loads available promocodes | Promo block появляется, если backend вернул промокоды | TODO |
| Activate promocode | Activation создана, UI показывает active state | TODO |
| Profile promocodes | Activation появляется в профиле | TODO |
| Copy activation | Код копируется, статус обновляется | TODO |
| Use activation | Статус становится used | TODO |
| Catalog promo badge | Оффер с активным промокодом показывает badge | TODO |

## 6. Cart & Purchase

| Сценарий | Ожидаемый результат | Статус |
| --- | --- | --- |
| Add item to cart | Товар появляется в корзине | TODO |
| Select activated promocode | Скидка пересчитывается | TODO |
| Buy with `promocodeActivationId` | Покупка проходит, activation становится used | TODO |
| Buy without promo | Покупка проходит | TODO |
| Use points | Points discount применяется корректно | TODO |
| Gift purchase | Gift code flow работает | TODO |

## 7. Seller Dashboard

| Сценарий | Ожидаемый результат | Статус |
| --- | --- | --- |
| User without company opens seller | Появляется company apply gate | TODO |
| Submit company application | Статус становится pending moderation | TODO |
| Pending company | Seller tools заблокированы | TODO |
| Active company | Seller tools доступны | TODO |
| Create offer | Оффер появляется в seller list | TODO |
| Create promocode | Промокод появляется в list | TODO |
| Edit promocode | Изменения сохраняются | TODO |
| Change promocode status | Active/paused/archived обновляется | TODO |
| Set validFrom/validTo | Даты сохраняются и валидируются | TODO |

## 8. Payments & Wallet

| Сценарий | Ожидаемый результат | Статус |
| --- | --- | --- |
| Top up balance | Открывается payment URL | TODO |
| Production mock webhook disabled | Dev-only path не доступен | DONE |
| Active purchase shows Wallet button | Кнопка видна, если pass доступен | TODO |
| Add to Apple Wallet | PassKit открывается на реальном устройстве | TODO |
| Wallet cert error | Пользователь видит понятную ошибку | TODO |

## 9. Push & Location

| Сценарий | Ожидаемый результат | Статус |
| --- | --- | --- |
| APNS token registration | Токен отправляется в backend | TODO |
| Location permission | Появляется permission prompt | TODO |
| Nearby offers | Офферы сортируются/фильтруются по расстоянию | TODO |
| Geofence notification | Local notification срабатывает | TODO |

## 10. Готовность к App Store

| Материал | Статус |
| --- | --- |
| App name | TODO |
| Subtitle | TODO |
| Description | TODO |
| Keywords | TODO |
| Screenshots | TODO |
| Privacy policy URL | TODO |
| Support URL | TODO |
| App privacy labels | TODO |
| Test account | TODO |

## Правило релиза

Не выпускать, пока:

- полный `xcodebuild` не проходит;
- login/purchase/promocode/company flows не проходят на устройстве;
- Apple Wallet не проверен на реальном iPhone;
- production endpoint не использует mock/dev-only поведение.
