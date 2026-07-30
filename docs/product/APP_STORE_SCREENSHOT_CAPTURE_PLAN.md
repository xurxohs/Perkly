# Perkly iOS: real screenshot capture plan

Цель: снять только реальные экраны финального build. Не генерировать UI, не дорисовывать функции и не подменять отсутствующие изображения.

Актуальные размеры сверены 16 июля 2026 года:

- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/

## Обязательные device sets

Текущий target поддерживает iPhone и iPad, поэтому нужны оба набора.

### iPhone 6.9-inch

Рекомендуемый capture device: iPhone 16 Pro Max simulator/device.

Допустимые portrait-размеры в текущей спецификации Apple:

- `1320 × 2868`;
- `1290 × 2796`;
- `1260 × 2736`.

Использовать один согласованный размер для всего набора. Рекомендуемый master: `1320 × 2868`.

### iPad 13-inch

Рекомендуемый capture device: iPad Pro 13-inch simulator/device.

Допустимые portrait-размеры:

- `2064 × 2752`;
- `2048 × 2732`.

Рекомендуемый master: `2064 × 2752`.

### Формат

- от 1 до 10 изображений на device set/localization;
- `.png`, `.jpg` или `.jpeg`;
- без alpha/transparency;
- одинаковая ориентация внутри визуальной серии;
- App Preview необязателен.

## Рекомендуемая серия из шести экранов

Каждый кадр снять отдельно на iPhone и iPad из одного и того же review dataset.

| № | Экран | Что должно быть видно | Данные/состояние |
| --- | --- | --- | --- |
| 1 | Home | ценность продукта, подборки, UZS, реальные изображения | авторизованный review account; backend online |
| 2 | Catalog | категории, карточки, избранное, цены UZS | минимум 6 реальных активных offers |
| 3 | Offer Detail | название, условия, цена, защита покупки, CTA | offer без чужих торговых марок и спорных лицензий |
| 4 | Map / Nearby | реальные точки и optional location UX | разрешение location выдано; никаких fake pins |
| 5 | Purchases | активная/завершённая purchase и понятный статус | не показывать секретный код, email или transaction token |
| 6 | Profile / Saved / Support | сохранённые offers, профиль, support entry | нейтральное имя и avatar review account |

Альтернатива кадру 4: Events/Topka, если карта на iPad выглядит незавершённой или location dataset недостаточен.

Seller/Admin screens не ставить в основную consumer-серию, если они не являются ключевым публичным use case.

## Capture dataset

До съёмки создать стабильные production-like данные:

- 8–12 активных offers;
- минимум 4 категории;
- все цены — целые UZS;
- лицензированные собственные изображения;
- короткие понятные titles;
- один бесплатный промокод;
- один физический/offline offer;
- один корректный review purchase;
- 3–5 events с актуальными датами;
- ни одного `demo`, lorem ipsum, localhost, staging, `$`, broken image или пустого skeleton.

Не использовать реальные данные пользователей, продавцов, переписок и платежей.

## Capture procedure

1. Собрать final Release configuration с production API.
2. Установить build на нужный simulator/device с чистого состояния.
3. Войти review account.
4. Отключить debug overlays, network inspector и diagnostics banners.
5. Проверить дату/время, Wi‑Fi и battery status bar.
6. Дождаться полной загрузки изображений; не снимать skeleton state.
7. Проверить отсутствие secrets, email, gift code, JWT, internal IDs и чужих сообщений.
8. Снять raw screenshot средствами simulator/device.
9. Проверить фактический pixel size.
10. Экспортировать без alpha.
11. Сравнить iPhone и iPad: контент не обрезан, CTA доступен, tab bar не перекрывает экран.
12. Повторить для каждого поддерживаемого App Store locale.

## Anti-fake rules

Разрешено:

- crop до официального размера без изменения UI;
- системная нормализация status bar;
- лёгкий цветовой профиль без изменения смысла;
- короткий factual caption вне device frame, если он не закрывает интерфейс.

Запрещено:

- AI-generated app screens;
- вставка несуществующих offers, balances, reviews или maps;
- дорисованный CTA;
- скрытие ошибок ретушью;
- подмена broken image;
- обещание cashback/discount, которого нет в кадре;
- чужие фото без прав;
- упоминание награды или рейтинга, которых Perkly не получал.

Предпочтительный первый submission: raw full-device screenshots без маркетинговых рамок.

## Localization reality

В Xcode project добавлены `ru` и `uz`, центральный `L10n`, `Localizable.strings` и локализованные permission strings. Таблицы существенно расширены, но полнота ключей и fallback ещё должны быть проверены перед съёмкой.

- Русскую серию снимать после ручного прохода всего видимого UI и проверки fallback keys.
- Uzbek серию снимать после ручной лингвистической проверки носителем языка и layout QA.
- App Store metadata locale Uzbek отсутствует; Uzbek screenshots нельзя маскировать под English (U.K.) screenshots.
- Для storefront Узбекистана подготовить настоящую English (U.K.) metadata и, при необходимости, English UI/screenshots.

## Visual QA перед upload

Для каждого кадра:

- [ ] нет обрезанного текста;
- [ ] Dynamic Type default не ломает layout;
- [ ] нет overlap tab bar / CTA / safe area;
- [ ] iPad не выглядит растянутой iPhone-копией;
- [ ] изображения резкие и имеют права;
- [ ] UZS формат единообразен;
- [ ] нет долларовых символов;
- [ ] нет placeholder/demo data;
- [ ] нет персональных или секретных данных;
- [ ] contrast читаемый;
- [ ] selected states и Liquid Glass не превращаются в непрозрачную «пластмассу»;
- [ ] Reduce Transparency fallback не создаёт чёрные пятна;
- [ ] VoiceOver labels проверены на показанных ключевых controls.

## Naming convention

```text
ru-iPhone69-01-home.png
ru-iPhone69-02-catalog.png
ru-iPhone69-03-offer.png
ru-iPhone69-04-map.png
ru-iPhone69-05-purchases.png
ru-iPhone69-06-profile.png

ru-iPad13-01-home.png
...
```

Raw captures хранить отдельно от upload-ready exports, чтобы при обновлении captions не переснимать приложение.
