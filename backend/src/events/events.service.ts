import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Event, Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.EventCreateInput): Promise<Event> {
    return await this.prisma.event.create({
      data,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.EventWhereUniqueInput;
    where?: Prisma.EventWhereInput;
    orderBy?: Prisma.EventOrderByWithRelationInput;
  }): Promise<{ data: Event[]; total: number }> {
    const { skip, take, cursor, where, orderBy } = params;
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        skip,
        take,
        cursor,
        where,
        orderBy,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { data, total };
  }

  async findOne(id: string): Promise<Event | null> {
    return await this.prisma.event.findUnique({
      where: { id },
    });
  }

  async update(params: {
    where: Prisma.EventWhereUniqueInput;
    data: Prisma.EventUpdateInput;
  }): Promise<Event> {
    const { where, data } = params;
    return await this.prisma.event.update({
      data,
      where,
    });
  }

  async remove(where: Prisma.EventWhereUniqueInput): Promise<Event> {
    return this.prisma.event.delete({
      where,
    });
  }

  // Helper for mock data generation or seeding
  async seedEvents(organizerId: string) {
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
      await this.prisma.event.create({
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
          imageUrl: `https://picsum.photos/seed/${i + 20}/800/1200`,
          viewersCount: Math.floor(Math.random() * 200) + 50,
          participantsCount: Math.floor(Math.random() * 1500) + 200,
          organizerId,
        },
      });
    }
  }
}
