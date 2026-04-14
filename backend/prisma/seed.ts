import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { OfferCategory, Role, Tier } from '../src/common/enums';
const prisma = new PrismaClient();

async function main() {
    console.log('Clearing existing records to avoid foreign key errors...');
    await prisma.dispute.deleteMany();
    await prisma.message.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.review.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.offer.deleteMany();

    console.log('Ensuring System User exists...');
    const systemUser = await prisma.user.upsert({
        where: { email: 'system@perkly.app' },
        update: {},
        create: {
            email: 'system@perkly.app',
            displayName: 'Perkly System',
            role: Role.ADMIN,
            tier: Tier.PLATINUM,
        }
    });

    console.log('Seeding Offers...');
    const flashDropTime = new Date();
    flashDropTime.setHours(flashDropTime.getHours() + 5); // 5 hours from now

    await prisma.offer.createMany({
        data: [
            {
                title: 'Промокод на Кофе в Safia',
                description: 'Получите любой кофе (до 400 мл) бесплатно по этому уникальному промокоду. Только сегодня!',
                price: 0.50,
                category: OfferCategory.RESTAURANTS,
                hiddenData: 'SAFIA-COFFEE-FREE-2026',
                sellerId: systemUser.id,
                isFlashDrop: true,
                expiresAt: flashDropTime
            },
            {
                title: 'Yandex Plus на 6 месяцев',
                description: 'Активация подписки Яндекс Плюс Мульти на ваш аккаунт',
                price: 2.00,
                category: OfferCategory.SUBSCRIPTIONS,
                hiddenData: 'YANDEX-PLUS-PROMO-6M',
                sellerId: systemUser.id,
                isFlashDrop: true,
                expiresAt: flashDropTime
            },
            {
                title: 'Netflix Premium на 1 Месяц',
                description: '1 экран 4K Ultra HD. Подходит для ТВ.',
                price: 4.99,
                category: OfferCategory.SUBSCRIPTIONS,
                hiddenData: 'NETFLIX-ACCOUNT-CREDS-HERE',
                sellerId: systemUser.id,
                isFlashDrop: false
            },
            {
                title: 'Dodo Pizza: Большая пицца в подарок',
                description: 'Промокод на любую пиццу 35см при заказе от 5$.',
                price: 1.50,
                category: OfferCategory.RESTAURANTS,
                hiddenData: 'DODO-PIZZA-BIG-PROMO',
                sellerId: systemUser.id,
                isFlashDrop: false
            },
            {
                title: 'Uzum Market: Скидка 50 000 сум',
                description: 'Купон на первый заказ от 200 000 сум в приложении Uzum Market.',
                price: 0.99,
                category: OfferCategory.MARKETPLACES,
                hiddenData: 'UZUM-FIRST-50K',
                sellerId: systemUser.id,
                isFlashDrop: true,
                expiresAt: flashDropTime
            },
            {
                title: 'Yandex Go: -30% на 3 поездки',
                description: 'Активируйте промокод и получите скидку на следующие 3 поездки в тарифе Комфорт или Бизнес.',
                price: 1.20,
                category: OfferCategory.OTHER,
                hiddenData: 'YANDEX-GO-30PERCENT',
                sellerId: systemUser.id,
                isFlashDrop: false
            },
            {
                title: 'Skillbox: Скидка 55% на любой курс',
                description: 'Уникальный промокод на покупку курсов программирования, дизайна и маркетинга.',
                price: 5.00,
                category: OfferCategory.COURSES,
                hiddenData: 'SKILLBOX-TECH-55',
                sellerId: systemUser.id,
                isFlashDrop: false
            },
            {
                title: 'Evos: Комбо со скидкой 40%',
                description: 'Промокод на Лаваш Комбо (Лаваш + фри + Кола 0.5) со скидкой 40% при самовывозе.',
                price: 0.80,
                category: OfferCategory.RESTAURANTS,
                hiddenData: 'EVOS-COMBO-40',
                sellerId: systemUser.id,
                isFlashDrop: true,
                expiresAt: flashDropTime
            },
            {
                title: 'BeFit: Абонемент на 1 месяц',
                description: 'Гостевой пас (безлимит) на 1 месяц в любой зал BeFit.',
                price: 15.00,
                category: OfferCategory.FITNESS,
                hiddenData: 'BEFIT-1MONTH-FREE',
                sellerId: systemUser.id,
                isFlashDrop: false
            },
            {
                title: 'Steam: Пополнение баланса 10$',
                description: 'Код на пополнение кошелька Steam на 10 долларов (США/Global).',
                price: 8.50,
                category: OfferCategory.GAMES,
                hiddenData: 'STEAM-WALLET-10USD-XYZ123',
                sellerId: systemUser.id,
                isFlashDrop: false
            },
            {
                title: 'Telegram Premium 1 Месяц',
                description: 'Подарочная подписка Telegram Premium на 1 месяц.',
                price: 2.50,
                category: OfferCategory.SUBSCRIPTIONS,
                hiddenData: 'https://t.me/giftcode/XXXX-YYYY-ZZZZ',
                sellerId: systemUser.id,
                isFlashDrop: true,
                expiresAt: flashDropTime
            }
        ]
    });
    console.log('Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
