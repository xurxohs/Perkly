# Topka внутри Perkly

Topka — функция Perkly для редакционного контента, городских подборок и событий. Это не самостоятельный сайт или отдельный backend.

## Где находится код

### iOS

- `apps/mobile/PerklyApp/PerklyApp/Views/Feed/`
- `apps/mobile/PerklyApp/PerklyApp/Models/Event.swift`
- `apps/mobile/PerklyApp/PerklyApp/Services/EventsService.swift`
- вкладка «Топка» подключена в `Views/MainTabView.swift`

### Web

- `apps/web/perkly/frontend/src/app/feed/`
- `apps/web/perkly/frontend/src/app/news/`
- `apps/web/perkly/frontend/src/app/admin/topka/`

### Backend

- `apps/web/perkly/backend/src/events/`
- `apps/web/perkly/backend/src/topka-admin/`
- связанные данные главной страницы находятся в `src/home/`

## Архитектурное правило

Topka использует общие аккаунты, API, базу данных, админку и инфраструктуру Perkly. Не нужно создавать для неё отдельный репозиторий или дублировать авторизацию и backend.

