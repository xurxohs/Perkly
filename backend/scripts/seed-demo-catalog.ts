import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BETA_SELLER_ID = '00000000-0000-4000-8000-00000000d001';

type Template = {
  title: string;
  image: string;
  price: number;
  fulfillment?: string;
  prompt?: string;
  periodDays?: number;
  sourceUrl?: string;
};

const catalog: Record<string, Template[]> = {
  RESTAURANTS: [
    { title: 'Комбо на двоих', image: '/brands/evos.png', price: 79000 },
    { title: 'Пицца 30 см', image: '/brands/dodo_pizza.svg', price: 69000 },
    { title: 'Кофе и десерт', image: '/brands/safia.png', price: 39000 },
    { title: 'Сет национальной кухни', image: '/brands/gijduvon.png', price: 119000 },
    { title: 'Скидка на заказ', image: '/brands/oqtepa.png', price: 25000, fulfillment: 'PROMOCODE' },
  ],
  SUBSCRIPTIONS: [
    { title: 'Telegram Premium', image: '/brands/telegram.svg', price: 59000, periodDays: 30, prompt: 'Укажите Telegram @username', sourceUrl: 'https://playerok.com/telegram/premium' },
    { title: 'Telegram Stars', image: '/demo-catalog/playerok-telegram-stars.jpg', price: 29000, prompt: 'Укажите Telegram @username', sourceUrl: 'https://playerok.com/telegram/stars' },
    { title: 'Yandex Plus', image: '/brands/yandex_plus.svg', price: 35000, periodDays: 30 },
    { title: 'Netflix Premium', image: '/brands/netflix.svg', price: 89000, periodDays: 30 },
    { title: 'Kling AI Standard', image: '/demo-catalog/playerok-kling.jpg', price: 149000, periodDays: 30, prompt: 'Укажите email аккаунта', sourceUrl: 'https://playerok.com/products/1b6ea1c81781-kling-ai-standard-1-mesyac-podpiski-bystroe-vypolnenie' },
  ],
  GAMES: [
    { title: 'Steam Wallet', image: '/brands/steam.svg', price: 50000, prompt: 'Укажите логин Steam' },
    { title: 'Игровая валюта', image: '/brands/steam.svg', price: 75000, prompt: 'Укажите ID игрока' },
    { title: 'Battle Pass', image: '/brands/steam.svg', price: 99000, prompt: 'Укажите ID игрока' },
    { title: 'Подарочная карта', image: '/brands/steam.svg', price: 120000, fulfillment: 'DIGITAL_CODE' },
    { title: 'Пополнение баланса', image: '/brands/steam.svg', price: 200000, prompt: 'Укажите логин аккаунта' },
  ],
  COURSES: [
    { title: 'Курс английского языка', image: '/brands/skillbox.svg', price: 199000, periodDays: 30 },
    { title: 'Основы дизайна', image: '/brands/skillbox.svg', price: 249000, periodDays: 30 },
    { title: 'Frontend-разработка', image: '/brands/skillbox.svg', price: 399000, periodDays: 60 },
    { title: 'Подготовка к IELTS', image: '/brands/skillbox.svg', price: 299000, periodDays: 30 },
    { title: 'Маркетинг для бизнеса', image: '/brands/skillbox.svg', price: 349000, periodDays: 45 },
  ],
  MARKETPLACES: [
    { title: 'Сертификат Uzum Market', image: '/brands/uzum_market.svg', price: 100000, fulfillment: 'DIGITAL_CODE' },
    { title: 'Скидка на первый заказ', image: '/brands/uzum_market.svg', price: 15000, fulfillment: 'PROMOCODE' },
    { title: 'Подарочная карта', image: '/brands/uzum_market.svg', price: 250000, fulfillment: 'DIGITAL_CODE' },
    { title: 'Бесплатная доставка', image: '/brands/uzum_market.svg', price: 12000, fulfillment: 'PROMOCODE' },
    { title: 'Купон на покупку', image: '/brands/uzum_market.svg', price: 50000, fulfillment: 'PROMOCODE' },
  ],
  TOURISM: [
    { title: 'Трансфер по Ташкенту', image: '/brands/yandex_go.svg', price: 85000 },
    { title: 'Экскурсия по Самарканду', image: '/demo-events/exhibition.png', price: 249000 },
    { title: 'Тур выходного дня', image: '/demo-events/festival.png', price: 499000 },
    { title: 'Поездка в горы', image: '/demo-events/party.png', price: 349000 },
    { title: 'Гид по старому городу', image: '/demo-events/exhibition.png', price: 179000 },
  ],
  FITNESS: [
    { title: 'Разовое посещение', image: '/brands/befit.png', price: 45000 },
    { title: 'Абонемент на месяц', image: '/brands/befit.png', price: 399000, periodDays: 30 },
    { title: 'Персональная тренировка', image: '/brands/befit.png', price: 149000 },
    { title: 'Групповая тренировка', image: '/brands/befit.png', price: 75000 },
    { title: 'Фитнес и бассейн', image: '/brands/befit.png', price: 499000, periodDays: 30 },
  ],
  OTHER: [
    { title: 'Билет на концерт', image: '/demo-events/comedy.png', price: 150000, fulfillment: 'DIGITAL_CODE' },
    { title: 'Билет на фестиваль', image: '/demo-events/festival.png', price: 120000, fulfillment: 'DIGITAL_CODE' },
    { title: 'Сертификат на услугу', image: '/demo-events/exhibition.png', price: 200000, fulfillment: 'DIGITAL_CODE' },
    { title: 'Фотосессия', image: '/demo-events/party.png', price: 399000 },
    { title: 'Мастер-класс', image: '/demo-events/food.png', price: 179000 },
  ],
};

const offers = Object.entries(catalog).flatMap(([category, templates], categoryIndex) =>
  Array.from({ length: 24 }, (_, index) => {
    const template = templates[index % templates.length];
    const variant = Math.floor(index / templates.length) + 1;
    const finalId = (categoryIndex * 100 + index + 1).toString(16).padStart(12, '0');
    return {
      id: `10000000-0000-4000-8000-${finalId}`,
      title: variant === 1 ? template.title : `${template.title} · вариант ${variant}`,
      description: 'Beta-предложение для проверки каталога, оформления заказа, статусов и сценария выдачи.',
      price: template.price + (variant - 1) * 5000,
      discountPercent: index % 4 === 0 ? 15 : index % 7 === 0 ? 25 : 0,
      vendorLogo: template.image,
      imageUrl: template.image,
      images: [template.image],
      category,
      fulfillmentType: template.fulfillment ?? 'INSTRUCTIONS',
      periodDays: template.periodDays ?? 0,
      deliveryEstimateMinutes: 5 + (index % 6) * 5,
      warrantyDays: 7,
      stockQuantity: 20 + (index % 9) * 5,
      buyerInputPrompt: template.prompt ?? 'Комментарий к заказу',
      buyerInputRequired: Boolean(template.prompt),
      sourceUrl: template.sourceUrl,
      usageInstructions: 'После оформления откройте покупку и следуйте инструкции. Выдача в beta-каталоге отключена.',
      hiddenData: 'BETA: тестовая выдача, реальный товар не предоставляется.',
      isActive: true,
      isDemo: true,
      moderationStatus: 'APPROVED',
      sellerId: BETA_SELLER_ID,
    };
  }),
);

async function main() {
  if (process.env.ALLOW_DEMO_CATALOG !== 'true') throw new Error('Set ALLOW_DEMO_CATALOG=true explicitly.');
  await prisma.user.upsert({
    where: { email: 'demo-catalog@perkly.local' },
    update: { displayName: 'Perkly Beta', role: 'VENDOR', accountStatus: 'ACTIVE' },
    create: { id: BETA_SELLER_ID, email: 'demo-catalog@perkly.local', displayName: 'Perkly Beta', role: 'VENDOR' },
  });
  await prisma.offer.deleteMany({ where: { isDemo: true } });
  await prisma.offer.createMany({ data: offers });
  console.log(`Beta catalog ready: ${offers.length} offers, ${Object.keys(catalog).length} sections.`);
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
