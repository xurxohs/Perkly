import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from '../bot/bot.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private botService: BotService,
  ) {}

  async getRooms(userId: string, role?: string) {
    const whereClause =
      role === 'ADMIN'
        ? {}
        : {
            participants: {
              some: { id: userId },
            },
          };

    return this.prisma.chatRoom.findMany({
      where: whereClause,
      include: {
        participants: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
        transaction: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(roomId: string, userId: string, skip = 0, take = 50) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });

    if (!room) throw new NotFoundException('Room not found');

    const userRecord = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isAdmin = userRecord?.role === 'ADMIN';

    if (!isAdmin && !room.participants.some((p) => p.id === userId)) {
      throw new ForbiddenException('Access denied to this chat room');
    }

    const messages = await this.prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' }, // Descending for pagination, frontend will reverse
      skip,
      take,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    return { data: messages };
  }

  async createOrGetDirectRoom(userId1: string, userId2: string) {
    if (userId1 === userId2) {
      throw new BadRequestException('Cannot create a chat room with yourself');
    }

    // Try to find existing DIRECT room with these EXACT two participants
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { id: userId1 } } },
          { participants: { some: { id: userId2 } } },
        ],
      },
      include: { participants: true },
    });

    const existingRoom = rooms.find((r) => r.participants.length === 2);

    if (existingRoom) {
      return existingRoom;
    }

    // Create new DIRECT room
    return this.prisma.chatRoom.create({
      data: {
        type: 'DIRECT',
        participants: {
          connect: [{ id: userId1 }, { id: userId2 }],
        },
      },
      include: { participants: true },
    });
  }

  async createDisputeRoom(
    transactionId: string,
    buyerId: string,
    sellerId: string,
  ) {
    // Check if dispute room already exists for this transaction
    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: { type: 'DISPUTE', transactionId },
    });

    if (existingRoom) return existingRoom;

    return this.prisma.chatRoom.create({
      data: {
        type: 'DISPUTE',
        transactionId,
        participants: {
          connect: [{ id: buyerId }, { id: sellerId }], // Admis can access by role
        },
      },
    });
  }

  async sendMessage(roomId: string, senderId: string, content: string) {
    const message = await this.prisma.message.create({
      data: {
        content,
        roomId,
        senderId,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    // Notify other participants in the room via Telegram
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: { select: { id: true, telegramId: true } },
        transaction: { include: { offer: { select: { title: true } } } },
      },
    });

    if (room && room.participants) {
      const otherParticipants = room.participants.filter(
        (p) => p.id !== senderId && p.telegramId,
      );

      let title = 'вам новое сообщение';
      if (room.type === 'DISPUTE')
        title = `новое сообщение в споре (Заказ: ${room.transaction?.offer?.title})`;

      for (const p of otherParticipants) {
        if (p.telegramId) {
          const telegramMessage = `💬 *У вас ${title}*\n\nОтправитель: ${message.sender?.displayName || message.sender?.email || 'Пользователь'}\nТекст: _${content}_\n\nОтветьте прямо здесь или перейдите в приложение!`;
          await this.botService.sendTelegramNotification(
            p.telegramId,
            telegramMessage,
          );
        }
      }
    }

    return message;
  }

  async markAsRead(roomId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: { roomId, isRead: false, senderId: { not: userId } },
      data: { isRead: true },
    });
    return { success: true };
  }
}
