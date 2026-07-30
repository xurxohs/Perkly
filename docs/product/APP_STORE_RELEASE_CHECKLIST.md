# Perkly iOS: App Store release checklist

Этот checklist дополняет `IOS_LAUNCH_CHECKLIST.md` и не меняет его историю.

## P0 — submission blockers

Submission запрещён, пока хотя бы один пункт не закрыт.

### Business model

- [ ] Для каждого типа offer определено: digital/in-app или physical/outside-app.
- [ ] Цифровые товары, цифровые коды, digital subscriptions и feature unlocks переведены на StoreKit/IAP либо полностью отключены в iOS.
- [ ] Click используется только в сценариях, разрешённых правилами Apple.
- [ ] Review Notes точно объясняют финальную payment model.
- [ ] Reviewer не должен использовать личные деньги.

### User-generated content

- [x] Добавлен server-side фильтр нежелательного seller/review/chat/event content.
- [x] Добавлен report action из iOS direct chat и backend moderation queue.
- [x] Добавлены block/unblock API, iOS block action и запрет direct interaction после блока.
- [ ] Filter/report/block пройдены вручную end-to-end на final production build.
- [ ] Есть SLA и административная очередь обработки report.
- [ ] Support contacts опубликованы в приложении и на Support URL.

### Legal URLs

- [x] Frontend `/support` page создана и проходит локальную web-сборку.
- [ ] `https://perkly.uz/privacy` отвечает `200` без login.
- [ ] `https://perkly.uz/terms` отвечает `200` без login.
- [ ] `https://perkly.uz/support` отвечает `200` без login.
- [ ] Страницы корректны на mobile Safari.
- [ ] Указано юридическое лицо/ИП, управляющее Perkly.
- [ ] Рабочий privacy/support email проверен входящим и исходящим письмом.
- [ ] Privacy policy соответствует фактической карте данных и third-party processors.

### Signing and identifiers

- [x] Release bundle ID установлен как `com.perkly.app`; Debug остаётся `com.perkly.app.dev`.
- [x] Release widget bundle ID установлен как `com.perkly.app.widgets`.
- [ ] App ID зарегистрирован в Apple Developer.
- [ ] App Group зарегистрирован и добавлен app + widget.
- [ ] Sign in with Apple capability работает с production backend.
- [ ] Push Notifications/APNs работают с production environment.
- [ ] Distribution certificate/profile валидны.
- [ ] Платная Apple Developer Team активна.

### Security and privacy

- [x] `NSAllowsArbitraryLoads` удалён из pbx и `project.yml`.
- [ ] Все production URL используют HTTPS.
- [x] Созданы валидные app/widget `PrivacyInfo.xcprivacy`.
- [x] App/widget privacy manifests добавлены в соответствующие PBX Resources phases.
- [ ] Наличие обоих manifests в Release archive проверено через полный Xcode.
- [ ] Required-reason APIs подтверждены Xcode Privacy Report.
- [ ] App Privacy answers согласованы с manifest и privacy policy.
- [ ] Google Sheets webhook/admin Telegram export отключены либо легально обоснованы и раскрыты.
- [ ] Production secrets отсутствуют в app bundle/repository.
- [x] `ITSAppUsesNonExemptEncryption = false` добавлен в app Info.plist.
- [ ] Account Holder подтвердил export-compliance classification итогового archive.

### Product completeness

- [ ] Нет staging host, `.dev` labels, demo mode, lorem ipsum и broken image.
- [ ] Нет долларовых цен; UZS format единообразен.
- [ ] Catalog, saved, purchase, support, delete-account работают на clean device.
- [ ] Все ссылки и deep links открываются.
- [ ] Seller/admin функции, не предназначенные consumer build, скрыты корректной server role, а не security-by-UI.
- [ ] Apple Wallet либо полностью работает, либо недоступная функция не рекламируется.
- [ ] Все offer/event images имеют документированные права.

## P1 — localization and accessibility

### Localization

- [ ] Russian metadata загружена из `APP_STORE_METADATA_RU.md`.
- [ ] English (U.K.) metadata загружена из `APP_STORE_METADATA_EN_GB.md`.
- [x] Добавлены RU/UZ `Localizable.strings`, `InfoPlist.strings` и центральный `L10n`.
- [ ] Наборы ключей RU/UZ localization tables синхронизированы без fallback gaps.
- [ ] Uzbek Latin copy вычитана носителем языка.
- [ ] Остаточные fallback/hardcoded строки найдены ручным проходом всех экранов.
- [ ] Реальная RU localization отображается без fallback.
- [ ] Реальная Uzbek Latin localization протестирована в приложении, даже если App Store metadata locale её не поддерживает.
- [ ] Legal/support pages доступны RU/UZ/EN.
- [ ] Не заявлен язык, на котором binary фактически не работает.

### Accessibility

- [ ] VoiceOver: auth, tab bar, catalog cards, favorite, checkout, chat, delete account.
- [ ] Dynamic Type: XS, default, AX5.
- [ ] Button Shapes и Differentiate Without Color.
- [ ] Reduce Motion.
- [ ] Reduce Transparency.
- [ ] Increase Contrast.
- [ ] Landscape проверен на iPad.
- [ ] External keyboard navigation проверена на iPad.
- [ ] Accessibility Nutrition Labels в App Store Connect заполнены только после фактического теста.

## P1 — metadata and review

- [ ] App name доступен и не нарушает trademark.
- [ ] Primary category = Shopping.
- [ ] Age Rating questionnaire заполнен с учётом UGC, chat, profanity, contests/wheel и commerce.
- [ ] Content Rights подтверждены для remote images, events, brands и seller content.
- [ ] Copyright содержит реального правообладателя.
- [ ] Support URL опубликован.
- [ ] Privacy Policy URL опубликован.
- [ ] Marketing URL работает.
- [ ] Description соответствует shipped build.
- [ ] Keywords укладываются в 100 bytes.
- [ ] Review contact доступен по телефону/email.
- [ ] Permanent review account создан и проверен.
- [ ] В `APP_REVIEW_NOTES.md` не осталось placeholders.
- [ ] Screenshot series снята по `APP_STORE_SCREENSHOT_CAPTURE_PLAN.md`.
- [ ] Для iPhone загружен 6.9-inch set.
- [ ] Для iPad загружен 13-inch set.
- [ ] Скриншоты не содержат fake data, PII и unlicensed images.

## P1 — build and archive

- [ ] Full Xcode build проходит на Release configuration.
- [ ] Unit/UI tests проходят.
- [ ] Проверен clean install.
- [ ] Проверено обновление с предыдущего TestFlight build, если он был.
- [ ] Version/build увеличены.
- [ ] Archive создан полным Xcode.
- [ ] Validate App проходит без errors/warnings, оставленных без объяснения.
- [ ] Privacy report просмотрен.
- [ ] Organizer archive содержит app + widget.
- [ ] dSYM сохранён и доступен diagnostics pipeline.
- [ ] TestFlight internal test завершён.
- [ ] TestFlight external test завершён хотя бы на нескольких физических устройствах.

## Production deploy gate

Production deployment — отдельное подтверждаемое действие, не автоматическая часть подготовки metadata.

- [ ] Зафиксирован release commit/tag.
- [ ] Создан production DB backup.
- [ ] Backup checksum проверен.
- [ ] Restore rehearsal выполнен на отдельной БД.
- [ ] Prisma migration plan просмотрен.
- [ ] Migration применена в maintenance window.
- [ ] Backend/frontend deploy завершён.
- [ ] `/health/live` и `/health/ready` зелёные.
- [x] Staging S3/CDN подготовлен.
- [ ] Production Redis/PostgreSQL/S3/CDN доступны и проверены.
- [ ] Privacy/terms/support pages реально отдаются production.
- [ ] Review account работает после migration.
- [ ] Production API совместим с App Store build.

## Post-deploy smoke test

- [ ] Email login/register.
- [ ] Sign in with Apple.
- [ ] Session restore/logout/delete.
- [ ] Catalog/search/category.
- [ ] Save/unsave.
- [ ] Location denied/granted.
- [ ] Offer detail.
- [ ] Разрешённый Apple payment flow.
- [ ] Purchase idempotency.
- [ ] Purchase history/status.
- [ ] Chat/report/block/dispute.
- [ ] APNs purchase/message/security notification.
- [ ] Image upload через production S3/CDN.
- [ ] Personal data export.
- [ ] Web privacy/terms/support.

## Monitoring after release

### Первые 2 часа

- [ ] Проверять readiness каждые 5 минут.
- [ ] Следить за 5xx, latency p95/p99, DB pool, Redis errors.
- [ ] Следить за auth failures и crash-free launches.
- [ ] Проверять duplicate deposits/transactions.
- [ ] Держать rollback owner на связи.

### Первые 24 часа

- [ ] Проверять App Store reviews/support tickets.
- [ ] Сверить Click callbacks с deposits/ledger.
- [ ] Проверить APNs delivery и invalid tokens.
- [ ] Проверить S3 upload/CDN error rate.
- [ ] Проверить diagnostics на новые crash/hang fingerprints.
- [ ] Проверить moderation queue и abuse reports.

### Первые 7 дней

- [ ] Ежедневная финансовая reconciliation.
- [ ] Ежедневная проверка backup.
- [ ] Crash-free sessions и launch time.
- [ ] Catalog/search latency.
- [ ] Conversion без раскрытия PII.
- [ ] Support response SLA.
- [ ] Privacy/delete/export requests.
- [ ] Решение go/no-go для phased release expansion.

## Release authority

Финальный `Submit for Review` выполняется только после письменного подтверждения владельца продукта, technical owner и privacy/legal owner. Production deploy и App Store submission должны иметь понятный rollback/cancel plan.
