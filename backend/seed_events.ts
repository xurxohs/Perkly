import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding events...');

  // 1. Create a dummy organizer if none exists
  let user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'organizer@perkly.uz',
        displayName: 'Perkly Events',
        role: 'ADMIN',
      },
    });
  }

  const organizerId = user.id;

  const categories = [
    'Фестиваль',
    'Выставка',
    'Вечеринка',
    'Концерт',
    'Мастер-класс',
  ];
  const titles = [
    'Neon Summer Fest',
    'Art & Tech Exhibition',
    'Underground Techno Night',
    'Digital Marketing Summit',
    'Wine & Jazz Evening',
  ];

  for (let i = 0; i < titles.length; i++) {
    await prisma.event.create({
      data: {
        title: titles[i],
        category: categories[i % categories.length],
        description:
          'Присоединяйтесь к нам для незабываемого вечера, полного эмоций, новых знакомств и ярких впечатлений. Самое ожидаемое событие этого сезона!',
        fullDescription:
          'Это мероприятие объединяет лучших представителей индустрии. Тебя ждет эксклюзивная программа, живое общение и специальные гости. Будь в центре событий вместе с Perkly.',
        date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        startTime: '19:00',
        ageLimit: i % 2 === 0 ? '18+' : '12+',
        location: 'Tashkent Hall',
        address: 'улица Амира Темура, 107',
        imageUrl: `https://picsum.photos/seed/${i + 42}/800/1200`,
        viewersCount: Math.floor(Math.random() * 200) + 50,
        participantsCount: Math.floor(Math.random() * 1500) + 200,
        organizerId,
      },
    });
  }

  console.log('Events seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
