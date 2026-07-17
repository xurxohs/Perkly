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
    await prisma.promocodeActivation.deleteMany();
    await prisma.savedOffer.deleteMany();
    await prisma.userInterest.deleteMany();
    await prisma.promocode.deleteMany();
    await prisma.offer.deleteMany();
    await prisma.company.deleteMany();
    await prisma.b2CProfile.deleteMany();

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
                title: 'Telegram Premium на 3 месяца',
                description: 'Подарочная подписка Telegram Premium на 3 месяца. Код активируется в Telegram.',
                price: 6000,
                category: OfferCategory.SUBSCRIPTIONS,
                hiddenData: 'https://t.me/giftcode/PERKLY-TELEGRAM-3M',
                sellerId: systemUser.id,
                isFlashDrop: true,
                expiresAt: flashDropTime,
                vendorLogo: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80',
            },
            {
                title: 'Yandex Plus на 6 месяцев',
                description: 'Активация подписки Яндекс Плюс Мульти на ваш аккаунт',
                price: 24000,
                category: OfferCategory.SUBSCRIPTIONS,
                hiddenData: 'YANDEX-PLUS-PROMO-6M',
                sellerId: systemUser.id,
                isFlashDrop: true,
                expiresAt: flashDropTime,
                vendorLogo: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80',
            },
            {
                title: 'Netflix Premium на 1 Месяц',
                description: '1 экран 4K Ultra HD. Подходит для ТВ.',
                price: 59880,
                category: OfferCategory.SUBSCRIPTIONS,
                hiddenData: 'NETFLIX-ACCOUNT-CREDS-HERE',
                sellerId: systemUser.id,
                isFlashDrop: false,
                vendorLogo: 'https://images.unsplash.com/photo-1574375927938-d5a98e8d7e28?w=800&q=80',
            },
            {
                title: 'Uzum Market: Скидка 100 000 сум',
                description: 'Промокод на заказ в Uzum Market от 300 000 сум.',
                price: 18000,
                category: OfferCategory.MARKETPLACES,
                hiddenData: 'UZUM-PERKLY-100K',
                sellerId: systemUser.id,
                isFlashDrop: false,
                vendorLogo: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&q=80',
            },
            {
                title: 'Uzum Market: Скидка 50 000 сум',
                description: 'Купон на первый заказ от 200 000 сум в приложении Uzum Market.',
                price: 11880,
                category: OfferCategory.MARKETPLACES,
                hiddenData: 'UZUM-FIRST-50K',
                sellerId: systemUser.id,
                isFlashDrop: true,
                expiresAt: flashDropTime,
                vendorLogo: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&q=80',
            },
            {
                title: 'Yandex Go: -30% на 3 поездки',
                description: 'Активируйте промокод и получите скидку на следующие 3 поездки в тарифе Комфорт или Бизнес.',
                price: 14400,
                category: OfferCategory.OTHER,
                hiddenData: 'YANDEX-GO-30PERCENT',
                sellerId: systemUser.id,
                isFlashDrop: false,
                vendorLogo: 'https://images.unsplash.com/photo-1449965408869-ebd13bc0b0df?w=800&q=80',
            },
            {
                title: 'Skillbox: Скидка 55% на любой курс',
                description: 'Уникальный промокод на покупку курсов программирования, дизайна и маркетинга.',
                price: 60000,
                category: OfferCategory.COURSES,
                hiddenData: 'SKILLBOX-TECH-55',
                sellerId: systemUser.id,
                isFlashDrop: false,
                vendorLogo: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80',
            },
            {
                title: 'PlayStation Plus Essential 1 месяц',
                description: 'Код подписки PS Plus Essential на 1 месяц для вашего аккаунта.',
                price: 9600,
                category: OfferCategory.GAMES,
                hiddenData: 'PSPLUS-PERKLY-1M',
                sellerId: systemUser.id,
                isFlashDrop: true,
                expiresAt: flashDropTime,
                vendorLogo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
            },
            {
                title: 'BeFit: Абонемент на 1 месяц',
                description: 'Гостевой пас (безлимит) на 1 месяц в любой зал BeFit.',
                price: 180000,
                category: OfferCategory.FITNESS,
                hiddenData: 'BEFIT-1MONTH-FREE',
                sellerId: systemUser.id,
                isFlashDrop: false,
                vendorLogo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
            },
            {
                title: 'Steam: Пополнение баланса',
                description: 'Код на пополнение кошелька Steam. Глобальный регион.',
                price: 102000,
                category: OfferCategory.GAMES,
                hiddenData: 'STEAM-WALLET-GLOBAL-XYZ123',
                sellerId: systemUser.id,
                isFlashDrop: false,
                vendorLogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
            },
            {
                title: 'Telegram Premium 1 Месяц',
                description: 'Подарочная подписка Telegram Premium на 1 месяц.',
                price: 30000,
                category: OfferCategory.SUBSCRIPTIONS,
                hiddenData: 'https://t.me/giftcode/XXXX-YYYY-ZZZZ',
                sellerId: systemUser.id,
                isFlashDrop: true,
                expiresAt: flashDropTime,
                vendorLogo: 'https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=800&q=80',
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
