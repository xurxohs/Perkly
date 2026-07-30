# Perkly Welcome Screen: Revolut-Style Adaptation Plan

## Что Делаем

Копируем композицию стартового экрана Revolut под Perkly:

- full-screen lifestyle photo background;
- крупный белый `Perkly` wordmark поверх фото;
- две нижние pill-кнопки;
- нижняя кнопка `Войти` с оригинальным SwiftUI Liquid Glass (`glassEffect`) на iOS 26+;
- staged intro animation: сначала логотип по центру, потом поднимается вверх, затем появляются кнопки;
- без дополнительных текстов, карточек, градиентных декоративных фонов и onboarding-объяснений.

Копируем layout, визуальную иерархию и поведение. Не копируем Revolut logo, фото, брендовые assets или код.

## Разбор Референса Revolut

Экран состоит из 4 слоев:

1. Native status bar

   - Белый status bar поверх изображения.
   - В SwiftUI не рисовать вручную, оставить системный status bar.

2. Full-bleed hero image

   - Фото занимает весь экран от края до края.
   - Верхняя треть: чистое небо/воздух для логотипа.
   - Средняя/нижняя часть: человек крупно, city lifestyle, телефон в руке.
   - Фото не выглядит как баннер или poster, это editorial/lifestyle кадр.

3. Brand wordmark

   - Белый крупный текст по центру.
   - Находится выше центра, примерно на 24-30% высоты экрана.
   - Ширина wordmark примерно 50-60% ширины экрана.
   - Без подзаголовка.

4. Bottom actions

   - Две кнопки почти на всю ширину экрана.
   - Отступы слева/справа примерно 4-5% ширины.
   - Высота кнопки примерно 60-68 pt.
   - Между кнопками 12-16 pt.
   - Primary: белая кнопка, черный текст.
   - Secondary: темное прозрачное стекло, белый текст, blur, border, highlight.

5. Motion sequence

   - При первом показе пользователь видит только full-screen фото и большой логотип ближе к центру экрана.
   - Через короткую паузу логотип плавно поднимается в финальную верхнюю позицию.
   - После/во время подъема снизу появляются кнопки.
   - Кнопки не должны резко возникать: нужен fade-in + небольшой slide-up.
   - Анимация должна ощущаться premium и спокойной, без bounce/игрушечности.

## Perkly-Адаптация

### Hero Image

Нужен собственный фон `WelcomeHero`, не Revolut image.

Требования к картинке:

- vertical portrait, близко к `9:19.5`;
- outdoor city/cafe/street lifestyle;
- человек с телефоном в нижней половине;
- верхняя часть светлая, желательно голубое небо;
- справа/слева могут быть здания/деревья как в референсе;
- без текста, логотипов, вывесок, брендов;
- не слишком темная;
- лицо/телефон не перекрываются кнопками;
- верхняя зона должна держать белый `Perkly`.

Prompt для генерации hero:

```text
Premium photorealistic vertical mobile welcome screen hero image for an app called Perkly. 
Outdoor city cafe street in daylight, blue sky in the upper third, stylish young adult holding a smartphone in the lower half, modern urban lifestyle, confident calm expression, editorial fintech/lifestyle campaign photography. 
Composition: portrait 9:19.5, clean negative space above the subject for a large white app wordmark, buildings and trees framing the sides, subject torso and face in lower-middle, phone visible near bottom-left or lower center.
Lighting: natural daylight, premium, crisp, realistic.
Constraints: no text, no logos, no brand names, no readable signs, no UI, no watermark, no Revolut references.
Avoid: black background, poster text, distorted hands, extra fingers, plastic skin, crowded scene.
```

### Wordmark

Используем текстовый wordmark `Perkly`.

Final SwiftUI specs:

- `Text("Perkly")`
- `.font(.system(size: 62, weight: .heavy))`
- `.foregroundColor(.white)`
- center aligned
- final top offset около `190-215 pt` на iPhone 15/16-size экране;
- final responsive formula: `top = screenHeight * 0.235`;
- font responsive: `min(66, screenWidth * 0.17)`.

Важно: не использовать градиентный круг Perkly на этом экране. Референс работает именно за счет чистого белого wordmark.

### Intro Animation

У Revolut экран не статичный: сначала wordmark находится ближе к центру, затем поднимается вверх и открывает место для CTA.

Perkly должен повторить этот сценарий:

1. Initial state, `0.0s`

   - hero image уже виден;
   - `Perkly` в центре или чуть выше центра;
   - кнопки скрыты;
   - buttons opacity `0`;
   - buttons y offset `28-40`.

2. Logo lift, `0.25-0.85s`

   - после паузы `0.25-0.35s`;
   - logo moves from center position to final top position;
   - duration `0.55-0.75s`;
   - easing: `.easeInOut` or smooth spring with low bounce;
   - no aggressive scale bounce.

3. CTA reveal, `0.65-1.15s`

   - кнопки появляются после начала подъема logo;
   - opacity `0 -> 1`;
   - y offset `32 -> 0`;
   - duration `0.35-0.50s`;
   - secondary glass can appear `0.06-0.10s` later than primary for layered feel.

Suggested state:

```swift
@State private var isIntroComplete = false
@State private var showActions = false
```

Suggested formulas:

```swift
let centeredLogoTop = proxy.size.height * 0.42
let finalLogoTop = proxy.size.height * 0.235
let logoTop = isIntroComplete ? finalLogoTop : centeredLogoTop
```

Suggested trigger:

```swift
.task {
    guard !isIntroComplete else { return }

    try? await Task.sleep(for: .milliseconds(280))
    withAnimation(.easeInOut(duration: 0.68)) {
        isIntroComplete = true
    }

    try? await Task.sleep(for: .milliseconds(120))
    withAnimation(.easeOut(duration: 0.42)) {
        showActions = true
    }
}
```

If `.task` repeats after navigation back, guard it so the animation does not restart annoyingly unless the whole `WelcomeView` is recreated.

### Primary Button

`Создать аккаунт`

Specs:

- width: full minus `18 pt` horizontal padding each side;
- height: `64 pt`;
- shape: capsule;
- background: `Color.white.opacity(0.98)`;
- text: black, `20 pt`, semibold/bold;
- shadow: subtle, чтобы отделить от фото.

### Secondary Liquid Glass Button

`Войти`

Это главный нюанс. На iOS 26+ используем системный SwiftUI Liquid Glass, а не нарисованную вручную имитацию.

Specs:

- width: same as primary;
- height: `64 pt`;
- shape: capsule;
- iOS 26+: `.glassEffect(.regular.tint(...).interactive(), in: Capsule())`;
- tint: dark glass, около `Color.black.opacity(0.36)`;
- shadow: black opacity `0.22-0.30`, radius `18-24`, y `10-12`;
- text: white, `20 pt`, semibold.

Fallback только для iOS 17-25:

```swift
Capsule()
    .fill(.ultraThinMaterial)
    .overlay {
        Capsule().fill(Color.black.opacity(0.28))
    }
    .overlay {
        Capsule().stroke(Color.white.opacity(0.24), lineWidth: 1)
    }
```

Основной путь для нового дизайна:

```swift
if #available(iOS 26.0, *) {
    Color.clear
        .glassEffect(
            .regular
                .tint(Color.black.opacity(0.36))
                .interactive(),
            in: Capsule()
        )
}
```

## SwiftUI Layout План

Файл:

`PerklyApp/PerklyApp/Views/Auth/WelcomeView.swift`

Структура:

```swift
NavigationStack {
    GeometryReader { proxy in
        ZStack {
            Image("WelcomeHero")
                .resizable()
                .scaledToFill()
                .frame(width: proxy.size.width, height: proxy.size.height)
                .clipped()
                .ignoresSafeArea()

            readabilityOverlay

            VStack {
                Spacer()
                    .frame(height: logoTop)

                Text("Perkly")
                    .font(.system(size: min(66, proxy.size.width * 0.17), weight: .heavy))
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.18), radius: 12, y: 5)

                Spacer()
            }

            VStack(spacing: 14) {
                Spacer()

                NavigationLink(destination: RegisterView()) {
                    Text("Создать аккаунт")
                }
                .buttonStyle(WelcomePrimaryButtonStyle())

                NavigationLink(destination: LoginView()) {
                    Text("Войти")
                }
                .buttonStyle(WelcomeGlassButtonStyle())
            }
            .padding(.horizontal, 18)
            .padding(.bottom, max(18, proxy.safeAreaInsets.bottom + 6))
            .opacity(showActions ? 1 : 0)
            .offset(y: showActions ? 0 : 34)
        }
    }
    .toolbar(.hidden, for: .navigationBar)
    .ignoresSafeArea()
}
```

Overlay должен быть только для читаемости:

- легкое затемнение сверху: `0.10-0.18`;
- легкое затемнение снизу: `0.22-0.32`;
- не превращать экран в черный.

## App Flow

В `PerklyApp.swift`:

```swift
if authVM.isLoading {
    SplashScreen()
} else if authVM.isAuthenticated {
    MainTabView()
} else {
    WelcomeView()
}
```

Guest user должен сначала видеть `WelcomeView`, а не `MainTabView`.

## Login Screen

Файл:

`PerklyApp/PerklyApp/Views/Auth/LoginView.swift`

Цель: экран входа должен быть продолжением welcome screen, а не отдельной темной формы.

Слои:

- тот же `WelcomeHero` full-screen background;
- белый `Perkly` wordmark сверху;
- нижняя glass-панель с формой;
- поля email/password в темных translucent rounded fields;
- primary white button `Войти`;
- secondary original Liquid Glass button `Войти через Telegram`;
- ссылка `Создать аккаунт`.

Основной backend action:

- `authVM.login()`
- endpoint: `POST /auth/login`

## Create Account Screen

Файл:

`PerklyApp/PerklyApp/Views/Auth/CreateAccountView.swift`

Важно: это отдельный экран создания аккаунта. Старый `RegisterView` остается для post-auth profile/onboarding setup.

Слои:

- тот же `WelcomeHero`;
- белый `Perkly` wordmark сверху;
- нижняя glass-панель;
- поля name/email/password;
- primary white button `Создать аккаунт`;
- secondary original Liquid Glass button `Продолжить через Telegram`;
- ссылка `Уже есть аккаунт? Войти`.

Основной backend action:

- `authVM.register()`
- current endpoints:
  - `POST /auth/register`
  - then `POST /auth/login`

Target improvement: backend should return auth token directly from register, so mobile app does not need register-then-login.

## Shared Native Auth Components

Файл:

`PerklyApp/PerklyApp/Views/Auth/PerklyAuthEntryComponents.swift`

Компоненты:

- `PerklyAuthHeroBackground`
- `PerklyAuthTextField`
- `PerklyAuthSecureField`
- `PerklyAuthErrorView`
- `PerklyAuthPrimaryButtonStyle`
- `PerklyAuthGlassButtonStyle`
- `authPanelGlass()`

Liquid Glass:

- iOS 26+: use original `.glassEffect(...)`;
- iOS 17-25: fallback to `.ultraThinMaterial`.

## Backend Additions

Чтобы auth flow был ближе к Revolut-level UX, backend стоит усилить так:

1. Register should return token

   - Change `POST /auth/register` response to `{ access_token, user }`.
   - Remove mobile register-then-login round trip.

2. Phone-first auth

   - Add `POST /auth/phone/start`.
   - Add `POST /auth/phone/verify`.
   - Add `POST /auth/phone/resend`.
   - Store normalized phone numbers.
   - Rate-limit by phone, IP, device id.
   - This is needed if we want real Revolut-style phone login/registration instead of email-first auth.

3. Auth session model

   - Add refresh tokens or durable session records.
   - Store device name, platform, app version, last seen, IP hash.
   - Add `POST /auth/logout-device`.
   - Add `GET /auth/sessions`.

4. Onboarding progress

   - Add `GET /users/me/onboarding`.
   - Add `PATCH /users/me/onboarding`.
   - Store steps: account created, profile completed, interests selected, notifications allowed, location allowed.
   - Mobile can resume exactly where user left off.

5. Consent and legal versioning

   - Add `POST /auth/consents`.
   - Store terms/privacy/marketing consent versions.
   - Return required consent state in `/users/me`.

6. Auth analytics

   - Track `welcome_viewed`, `create_account_tapped`, `login_tapped`, `register_success`, `login_success`, `auth_error`.
   - Store source: email, telegram, future phone OTP.

7. Better auth errors

   - Return structured error codes, not only text.
   - Examples: `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `PASSWORD_TOO_SHORT`, `OTP_EXPIRED`, `RATE_LIMITED`.
   - Mobile maps codes to polished Russian copy.

8. Remote auth screen config

   - Optional endpoint: `GET /app-config/auth`.
   - Can return hero image URL, auth methods enabled, legal URLs, experiments.
   - Useful later, but not required for the first native implementation.

## Native App Workflow

Правим только native SwiftUI app:

1. Все визуальные изменения делаем в `WelcomeView.swift`.
2. Hero image держим в `Assets.xcassets/WelcomeHero.imageset`.
3. Позиции и тайминги подгоняем через SwiftUI values:

   - `centeredLogoTop`;
   - `finalLogoTop`;
   - logo lift duration/delay;
   - button fade/slide duration/delay;
   - glass opacity/material/border.
4. Проверяем результат в Xcode canvas или на устройстве/симуляторе, когда это нужно.

## Acceptance Criteria

- Экран сразу считывается как Revolut-style welcome, но с брендом Perkly.
- Фон не черный: full-screen фото.
- On first appearance, `Perkly` starts near the center.
- `Perkly` smoothly moves upward into the final reference-like position.
- CTA buttons appear after the logo lift with fade + slide-up.
- Final `Perkly` position is крупный, белый, centered, расположен как в референсе.
- Нет подзаголовков и лишнего текста.
- Primary button белая и большая.
- Secondary button выглядит как Liquid Glass, фон виден через кнопку.
- Кнопки не перекрывают home indicator.
- Фото не содержит Revolut, чужие логотипы, текст или watermark.
- `Создать аккаунт` ведет в `RegisterView`.
- `Войти` ведет в `LoginView`.

## Что Не Делаем

- Не делаем черный splash.
- Не добавляем маркетинговый текст.
- Не рисуем кастомный status bar в SwiftUI.
- Не используем Revolut logo/photo/assets.
- Не добавляем карточки, blobs, gradient-only background.
- Не используем Perkly gradient circle как главный элемент на welcome screen.
