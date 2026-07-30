# Perkly: metadata copy — Uzbek Latin

Статус: продуктовая copy и RU/UZ localization resources подготовлены; лингвистический/device QA ещё не выполнен. Uzbek нельзя выбрать как App Store metadata localization на дату аудита.

## Важное ограничение App Store

Apple не включает Uzbek в список доступных локализаций App Store metadata. Для storefront Узбекистана default language указан как English (U.K.).

Следовательно:

- этот текст нельзя загружать как несуществующую `uz-Latn` localization;
- нельзя вставлять Uzbek copy в поле English (U.K.) и называть её английской локализацией;
- Russian localization можно добавить отдельно, но она не является default storefront language Узбекистана;
- перед релизом нужна полноценная English (U.K.) metadata;
- Uzbek copy использовать для текущей binary localization, сайта, onboarding, поддержки и фактических креативов после ручной вычитки.

Источник:

- https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations/

## Name

```text
Perkly
```

Длина: 6 символов.

## Subtitle

```text
Takliflar, kodlar, xaridlar
```

Длина: 27 символов.

## Promotional Text

```text
O‘zbekistondagi mahalliy va raqamli takliflarni toping, promokodlarni faollashtiring va UZSda himoyalangan xarid qiling — saralanganlar, xarita va yordam bilan.
```

Длина: 160 символов.

## Keywords

```text
chegirma,promokod,kupon,xarid,UZS,kafe,Toshkent,taklif,bonus
```

Размер: 60 bytes в UTF-8.

## Description

```text
Perkly O‘zbekistonda foydali mahalliy va raqamli takliflarni topish, saqlash, promokodlarni faollashtirish va xaridlarni bitta ilovada boshqarishga yordam beradi.

Perkly’da quyidagilar mavjud:

• narxlar faqat O‘zbekiston so‘mida (UZS) ko‘rsatiladigan katalog;
• qidiruv, toifalar, saralangan takliflar va shaxsiy tavsiyalar;
• ruxsat bersangiz, xaritada yaqin takliflar;
• himoyalangan xarid jarayoni va buyurtma holatini kuzatish;
• faol buyurtmalar, kodlar, sovg‘alar va tarix saqlanadigan xaridlar markazi;
• sotuvchi yoki yordam xizmati bilan chat, nizolar va murojaatlar;
• tadbirlar va yangi joylar tanlovi;
• tasdiqlangan hamkorlar uchun taklif va promokod yaratish vositalari.

Joylashuv, kamera va bildirishnomalar faqat tegishli funksiyani ishga tushirganda so‘raladi. Joylashuvga ruxsat bermasangiz ham katalog va asosiy imkoniyatlar ishlaydi.

Perkly bank kartasi rekvizitlarini saqlamaydi. Balansni to‘ldirish ulangan to‘lov provayderining himoyalangan sahifasida bajariladi.

Yordam: @perkly_support
```

Перед публичным использованием Uzbek copy должен вычитать носитель узбекского языка с продуктовым и юридическим контекстом. Термины `taklif`, `promokod`, `xarid`, `saralanganlar` должны быть единообразны во всём UI.

## What's New — version 1.0

```text
Perkly’ning ilk ommaviy relizi: takliflar katalogi, promokodlar, UZS narxlari, saralanganlar, xarita, tadbirlar, xaridlar markazi va yordam.
```

## URLs

| Поле | Значение | Текущий статус |
| --- | --- | --- |
| Marketing | `https://perkly.uz` | HTTP 200 |
| Support | `https://perkly.uz/support` | Frontend page готова локально; production пока 404 |
| Privacy | `https://perkly.uz/privacy` | 404, сначала опубликовать |
| Terms in app | `https://perkly.uz/terms` | 404, сначала опубликовать |

Желательно, чтобы public legal/support pages имели реальные версии на русском, узбекском и английском, даже несмотря на отсутствие Uzbek metadata locale в App Store Connect.
