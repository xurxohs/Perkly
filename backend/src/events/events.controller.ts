import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Event, Prisma } from '@prisma/client';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Body() createEventDto: Prisma.EventCreateInput): Promise<Event> {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ): Promise<{ data: Event[]; total: number }> {
    return this.eventsService.findAll({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      where: {
        category,
        OR: search ? [
          { title: { contains: search } },
          { description: { contains: search } },
        ] : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Event | null> {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEventDto: Prisma.EventUpdateInput,
  ): Promise<Event> {
    return this.eventsService.update({
      where: { id },
      data: updateEventDto,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<Event> {
    return this.eventsService.remove({ id });
  }

  @Post('seed')
  seed(@Query('organizerId') organizerId: string) {
    return this.eventsService.seedEvents(organizerId);
  }
}
