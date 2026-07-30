# Perkly iOS

Нативный SwiftUI-клиент Perkly для iPhone. Использует общий Perkly Backend и включает основное приложение, Widget и UI-тесты.

## Структура

- `PerklyApp/` — исходный код основного приложения.
  - `Views/` — экраны и визуальная композиция.
  - `ViewModels/` — состояние экранов и пользовательские действия.
  - `Models/` — структуры данных приложения и API.
  - `Services/` — сеть, авторизация, платежи, уведомления и другие интеграции.
  - `Components/` — повторно используемые элементы интерфейса.
  - `Utils/` — дизайн-система, локализация и вспомогательный код.
  - `Assets.xcassets/` — изображения, иконки и цвета.
- `PerklyWidgets/` — iOS Widget.
- `PerklyAppUITests/` — UI-тесты.
- `PerklyApp.xcodeproj/` — Xcode-проект.
- `project.yml` — исходная конфигурация XcodeGen.

## Поток запуска

```text
PerklyApp.swift
  → восстановление сессии
  → LoginView или MainTabView
  → ViewModel
  → Service
  → APIClient
  → Perkly Backend
```

## Topka

Topka — вкладка контента и событий внутри Perkly. Основные iOS-файлы находятся в `Views/Feed`, модели — в `Models/Event.swift`, сетевое взаимодействие — в `Services/EventsService.swift`.

## Где начинать

- Точка входа: `PerklyApp/PerklyApp.swift`
- Основная навигация: `PerklyApp/Views/MainTabView.swift`
- Сетевой клиент: `PerklyApp/Services/APIClient.swift`
- Адрес API: `PerklyApp/Utils/Constants.swift`

