import Foundation

@MainActor
final class FeedViewModel: ObservableObject {
    @Published var events: [Event] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var currentIndex = 0
    
    private let eventsService = EventsService.shared
    
    // Curated local catalog used to preview the complete Topka experience.
    static let demoEvents: [Event] = [
        Event(
            id: "demo-neon-garden",
            title: "Neon Garden",
            category: "Концерт",
            description: "Ночной open-air с живыми сетами, световыми инсталляциями и видом на вечерний Ташкент.",
            fullDescription: "Один вечер на стыке музыки, света и городской архитектуры. В программе — три live-сета, пространственный звук и специальная визуальная постановка. Посмотри [правила посещения](https://example.com/topka/neon-garden).",
            date: "2026-08-15T00:00:00Z",
            startTime: "20:30",
            ageLimit: "18+",
            location: "Anhor Park",
            address: "ул. Лабзак, 12",
            latitude: 41.3267,
            longitude: 69.2524,
            imageUrl: "",
            viewersCount: 684,
            participantsCount: 240,
            organizerId: "topka-demo",
            createdAt: nil,
            updatedAt: nil,
            postType: "event",
            subtitle: "Музыка после заката",
            tags: ["live", "open-air", "electronic"],
            badges: ["Выбор Topka"],
            endTime: "00:30",
            priceText: "от 180 000 сум",
            ctaText: "Получить билет",
            ctaUrl: "https://example.com/topka/neon-garden",
            priority: 1,
            isFeatured: true
        ),
        Event(
            id: "demo-form-01",
            title: "FORM / 01",
            category: "Выставка",
            description: "Иммерсивная выставка о форме, движении и цифровом пространстве без привычных музейных рамок.",
            fullDescription: "Пять залов превращаются в единый маршрут: генеративная графика реагирует на движение гостей, а звук меняется вместе с освещением. Вход по сеансам, чтобы сохранить камерную атмосферу. [Подробнее о художниках](https://example.com/topka/form-01).",
            date: "2026-08-22T00:00:00Z",
            startTime: "18:00",
            ageLimit: "12+",
            location: "Human House",
            address: "ул. Кичик Миробод, 43",
            latitude: 41.2918,
            longitude: 69.2702,
            imageUrl: "",
            viewersCount: 421,
            participantsCount: 96,
            organizerId: "topka-demo",
            createdAt: nil,
            updatedAt: nil,
            postType: "event",
            subtitle: "Искусство без рамок",
            tags: ["art", "digital", "installation"],
            badges: ["Премьера"],
            endTime: "22:00",
            priceText: "90 000 сум",
            ctaText: "Выбрать сеанс",
            ctaUrl: "https://example.com/topka/form-01",
            priority: 2,
            isFeatured: true
        ),
        Event(
            id: "demo-taste-after-dark",
            title: "Taste After Dark",
            category: "Фуд-Фест",
            description: "Ночной ужин-маршрут: пять авторских кухонь, один общий стол и меню, созданное специально для Topka.",
            fullDescription: "Гости перемещаются между пятью гастрономическими станциями и знакомятся с командами ресторанов. В билет входят все блюда и безалкогольный pairing. Сообщи об ограничениях при бронировании через [форму гостя](https://example.com/topka/taste-after-dark).",
            date: "2026-08-29T00:00:00Z",
            startTime: "19:30",
            ageLimit: "0+",
            location: "Depo Food Mall",
            address: "ул. Тараса Шевченко, 38",
            latitude: 41.2969,
            longitude: 69.2832,
            imageUrl: "",
            viewersCount: 358,
            participantsCount: 80,
            organizerId: "topka-demo",
            createdAt: nil,
            updatedAt: nil,
            postType: "event",
            subtitle: "Город на вкус",
            tags: ["food", "chef", "tasting"],
            badges: ["80 мест"],
            endTime: "23:00",
            priceText: "320 000 сум",
            ctaText: "Забронировать",
            ctaUrl: "https://example.com/topka/taste-after-dark",
            priority: 3,
            isFeatured: true
        ),
        Event(
            id: "demo-city-run",
            title: "City Run: Night",
            category: "Спорт",
            description: "Пятикилометровый ночной забег без секундомера — ради маршрута, музыки и города.",
            fullDescription: "Стартуем одной группой и движемся в комфортном темпе. На маршруте будут вода, медицинское сопровождение и две музыкальные точки. Участнику нужны удобная обувь и регистрация. [Посмотреть маршрут](https://maps.apple.com/?q=Amir+Temur+Square+Tashkent).",
            date: "2026-09-05T00:00:00Z",
            startTime: "21:00",
            ageLimit: "14+",
            location: "Сквер Амира Темура",
            address: "проспект Амира Темура",
            latitude: 41.3112,
            longitude: 69.2798,
            imageUrl: "",
            viewersCount: 517,
            participantsCount: 310,
            organizerId: "topka-demo",
            createdAt: nil,
            updatedAt: nil,
            postType: "event",
            subtitle: "Город в движении",
            tags: ["run", "community", "night"],
            badges: ["Бесплатно"],
            endTime: "22:30",
            priceText: "Бесплатно",
            ctaText: "Участвовать",
            ctaUrl: "https://example.com/topka/city-run",
            priority: 4,
            isFeatured: false
        ),
        Event(
            id: "demo-open-air-cinema",
            title: "Cinema Under Stars",
            category: "Кино",
            description: "Камерный кинопоказ во дворе: короткий метр, разговор с режиссёром и поздний кофе.",
            fullDescription: "Покажем четыре короткометражные работы молодых режиссёров Центральной Азии. После программы — открытое обсуждение с авторами. Рассадка свободная, пледы будут на месте. [Программа вечера](https://example.com/topka/cinema-under-stars).",
            date: "2026-09-12T00:00:00Z",
            startTime: "20:00",
            ageLimit: "16+",
            location: "Ilkhom Theatre",
            address: "ул. Пахтакор, 5",
            latitude: 41.3162,
            longitude: 69.2576,
            imageUrl: "",
            viewersCount: 276,
            participantsCount: 120,
            organizerId: "topka-demo",
            createdAt: nil,
            updatedAt: nil,
            postType: "event",
            subtitle: "Кино под открытым небом",
            tags: ["cinema", "shorts", "talk"],
            badges: ["Один вечер"],
            endTime: "23:10",
            priceText: "70 000 сум",
            ctaText: "Занять место",
            ctaUrl: "https://example.com/topka/cinema-under-stars",
            priority: 5,
            isFeatured: false
        )
    ]

    func loadDemoEvents() {
        error = nil
        isLoading = false
        events = Self.demoEvents
        currentIndex = 0
    }
    
    func loadEvents() async {
        isLoading = true
        error = nil
        
        do {
            let res = try await eventsService.list(take: 20)
            self.events = res.data
        } catch {
            self.error = error.localizedDescription
            if self.events.isEmpty {
                self.events = []
            }
        }
        
        isLoading = false
    }
}
