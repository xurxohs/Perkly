# Backend: карта модулей

Backend построен на NestJS. Каждый каталог обычно содержит `module`, `controller`, `service` и DTO своей предметной области.

## Ядро

- `auth`, `users` — регистрация, вход и профили.
- `prisma` — доступ к PostgreSQL.
- `infrastructure`, `diagnostics` — техническое состояние сервиса.
- `storage` — работа с загружаемыми файлами.

## Торговля

- `offers` — предложения.
- `cart` — корзина.
- `transactions`, `payments` — покупки и платежи.
- `promocodes` — промокоды и активации.
- `seller`, `companies`, `partner` — бизнес-сторона продукта.

## Взаимодействие

- `chat`, `notifications`, `bot` — сообщения и уведомления.
- `reviews`, `disputes`, `safety` — доверие и разрешение проблем.
- `analytics` — продуктовые события и показатели.

## Контент и Topka

- `events` — события и контент для клиентов.
- `home` — данные главной ленты.
- `topka-admin` — административное управление Topka внутри Perkly.
- `catalog-banners` — баннеры каталога.

## Точки входа

- `main.ts` — запуск HTTP-сервера и глобальная безопасность.
- `app.module.ts` — сборка всех модулей приложения.
- `prisma/prisma.service.ts` — подключение к базе.

