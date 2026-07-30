# Perkly Web

Веб-часть Perkly включает пользовательский сайт, кабинет продавца, админку и общий backend API для Web и iOS.

## Разделы

- [`frontend`](frontend/README.md) — Next.js-приложение, порт `3000`.
- [`backend`](backend/README.md) — NestJS/Fastify API, порт `3001`.
- `nginx/` — production-конфигурация reverse proxy.
- `scripts/` — серверные проверки и резервное копирование.
- `load/` — вспомогательные сценарии загрузки данных.
- `docker-compose.yml` — локальная инфраструктура.

## Связь компонентов

```text
Browser ─┐
         ├→ Backend API → Prisma → PostgreSQL
iOS ─────┘
```

Topka реализована внутри этих же frontend/backend: пользовательские страницы находятся в ленте и новостях, административные страницы — в `frontend/src/app/admin/topka`, API — в `backend/src/topka-admin` и связанных модулях событий.

