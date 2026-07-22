import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_SELLER_ID = '00000000-0000-4000-8000-00000000d001';

const demoOffers = [
  {
    id: '00000000-0000-4000-8000-00000000d101',
    title: 'Kling AI Standard — 1 месяц',
    description:
      'Демонстрационная карточка подписки. Активация выполняется продавцом после получения данных аккаунта.',
    price: 149000,
    discountPercent: 62,
    imageUrl: '/demo-catalog/playerok-kling.jpg',
    category: 'SUBSCRIPTIONS',
    periodDays: 30,
    deliveryEstimateMinutes: 10,
    warrantyDays: 7,
    stockQuantity: 25,
    buyerInputPrompt: 'Укажите email аккаунта Kling',
    sourceUrl:
      'https://playerok.com/products/1b6ea1c81781-kling-ai-standard-1-mesyac-podpiski-bystroe-vypolnenie',
  },
  ...[
    [50, 15000, 100],
    [100, 29000, 80],
    [200, 55000, 60],
    [500, 129000, 40],
  ].map(([amount, price, stock], index) => ({
    id: `00000000-0000-4000-8000-00000000d10${index + 2}`,
    title: `Telegram Stars — ${amount} звёзд`,
    description: `${amount} звёзд на Telegram-аккаунт по @username. Демонстрационная карточка сценария быстрой цифровой выдачи.`,
    price,
    discountPercent: amount >= 200 ? 20 : 10,
    imageUrl: '/demo-catalog/playerok-telegram-stars.jpg',
    category: 'SUBSCRIPTIONS',
    periodDays: 0,
    deliveryEstimateMinutes: 5,
    warrantyDays: 1,
    stockQuantity: stock,
    buyerInputPrompt: 'Укажите Telegram @username получателя',
    sourceUrl:
      'https://playerok.com/products/6dd405028c9d-50-zvyozd-po-yuzerneymu',
  })),
];

function assertExplicitConsent() {
  if (process.env.ALLOW_DEMO_CATALOG !== 'true') {
    throw new Error(
      'Demo seed disabled. Set ALLOW_DEMO_CATALOG=true explicitly.',
    );
  }
}

async function main() {
  assertExplicitConsent();
  await prisma.user.upsert({
    where: { email: 'demo-catalog@perkly.local' },
    update: {
      displayName: 'Perkly Demo',
      role: 'VENDOR',
      accountStatus: 'ACTIVE',
    },
    create: {
      id: DEMO_SELLER_ID,
      email: 'demo-catalog@perkly.local',
      displayName: 'Perkly Demo',
      role: 'VENDOR',
    },
  });

  for (const offer of demoOffers) {
    const { id, ...offerData } = offer;
    const data = {
      ...offerData,
      vendorLogo: offer.imageUrl,
      images: [offer.imageUrl],
      fulfillmentType: 'INSTRUCTIONS',
      buyerInputRequired: true,
      usageInstructions:
        'После оплаты проверьте введённые данные и откройте чат заказа. Это демонстрационная карточка — товар фактически не выдаётся.',
      hiddenData:
        'DEMO: товар не активируется и не предназначен для реальной покупки.',
      isActive: true,
      isDemo: true,
      moderationStatus: 'APPROVED',
      sellerId: DEMO_SELLER_ID,
    };
    await prisma.offer.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }
  console.log(`Demo catalog ready: ${demoOffers.length} offers.`);
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
