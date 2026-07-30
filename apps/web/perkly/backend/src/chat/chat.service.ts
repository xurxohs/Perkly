import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma } from '@prisma/client';
import { normalizePagination } from '../common/pagination';
import { assertAcceptableUserContent } from '../common/content-moderation';

const CHAT_PARTICIPANT_SELECT = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  role: true,
} as const;

const CHAT_MESSAGE_INCLUDE = {
  sender: {
    select: CHAT_PARTICIPANT_SELECT,
  },
} as const;

const CHAT_TRANSACTION_INCLUDE = {
  offer: {
    select: {
      id: true,
      title: true,
      price: true,
      category: true,
      vendorLogo: true,
      sellerId: true,
    },
  },
  buyer: {
    select: CHAT_PARTICIPANT_SELECT,
  },
  dispute: {
    select: {
      id: true,
      status: true,
      reason: true,
      createdAt: true,
    },
  },
} as const;

type ChatRealtimeEvent = {
  type: 'message_created' | 'messages_read' | 'typing' | 'room_updated';
  roomId: string;
  participantIds: string[];
  actorId?: string;
  message?: unknown;
  room?: unknown;
  isTyping?: boolean;
  readCount?: number;
  expiresAt?: string;
  createdAt: string;
};

@Injectable()
export class ChatService {
  private readonly events$ = new Subject<ChatRealtimeEvent>();

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getRooms(userId: string, role?: string, skip = 0, take = 20) {
    const pagination = normalizePagination(skip, take, {
      defaultTake: 20,
      maxTake: 100,
    });
    const blockedIds =
      role === 'ADMIN' ? [] : await this.blockedUserIds(userId);
    const whereClause: Prisma.ChatRoomWhereInput =
      role === 'ADMIN'
        ? {}
        : {
            AND: [
              { participants: { some: { id: userId } } },
              {
                OR: [
                  { type: { not: 'DIRECT' } },
                  { participants: { none: { id: { in: blockedIds } } } },
                ],
              },
            ],
          };

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where: whereClause,
        include: {
          participants: {
            select: CHAT_PARTICIPANT_SELECT,
          },
          transaction: {
            include: CHAT_TRANSACTION_INCLUDE,
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: CHAT_MESSAGE_INCLUDE,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.chatRoom.count({ where: whereClause }),
    ]);

    const roomIds = rooms.map((room) => room.id);
    const unreadRows =
      roomIds.length === 0
        ? []
        : await this.prisma.message.groupBy({
            by: ['roomId'],
            where: {
              roomId: { in: roomIds },
              isRead: false,
              senderId: { not: userId },
            },
            _count: { _all: true },
          });
    const unreadByRoomId = new Map(
      unreadRows.map((row) => [row.roomId, row._count._all]),
    );

    const data = rooms.map((room) => {
      const lastMessage = room.messages[0] ?? null;
      const transactionSummary = room.transaction
        ? this.buildTransactionSummary(room.transaction, userId, role)
        : null;

      return {
        ...room,
        roomType: room.type,
        roomStatus: this.getRoomStatus(room.type, transactionSummary),
        lastMessage,
        lastMessageAt: lastMessage?.createdAt ?? room.updatedAt,
        unreadCount: unreadByRoomId.get(room.id) ?? 0,
        transactionSummary,
      };
    });

    return {
      data,
      rooms: data,
      total,
      pagination: {
        ...pagination,
        total,
        hasMore: pagination.skip + data.length < total,
        nextSkip: pagination.skip + data.length,
      },
    };
  }

  async getMessages(roomId: string, userId: string, skip = 0, take = 50) {
    const access = await this.getAccessibleRoom(roomId, userId);
    const safeSkip = this.normalizeSkip(skip);
    const safeTake = this.normalizeTake(take);

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' }, // Descending for pagination, frontend will reverse
        skip: safeSkip,
        take: safeTake,
        include: CHAT_MESSAGE_INCLUDE,
      }),
      this.prisma.message.count({ where: { roomId } }),
    ]);

    return {
      data: messages,
      pagination: {
        skip: safeSkip,
        take: safeTake,
        total,
        hasMore: safeSkip + messages.length < total,
        nextSkip: safeSkip + messages.length,
      },
      room: {
        id: access.room.id,
        type: access.room.type,
        roomType: access.room.type,
        roomStatus: this.getRoomStatus(
          access.room.type,
          access.room.transaction
            ? this.buildTransactionSummary(
                access.room.transaction,
                userId,
                access.isAdmin ? 'ADMIN' : undefined,
              )
            : null,
        ),
        transactionSummary: access.room.transaction
          ? this.buildTransactionSummary(
              access.room.transaction,
              userId,
              access.isAdmin ? 'ADMIN' : undefined,
            )
          : null,
      },
    };
  }

  async createOrGetDirectRoom(userId1: string, userId2: string) {
    if (userId1 === userId2) {
      throw new BadRequestException('Cannot create a chat room with yourself');
    }
    await this.ensureUsersCanInteract(userId1, userId2);

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
    const room = await this.prisma.chatRoom.create({
      data: {
        type: 'DIRECT',
        participants: {
          connect: [{ id: userId1 }, { id: userId2 }],
        },
      },
      include: { participants: true },
    });

    this.emitEvent({
      type: 'room_updated',
      roomId: room.id,
      participantIds: room.participants.map((participant) => participant.id),
      room,
      createdAt: new Date().toISOString(),
    });

    return room;
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

    const room = await this.prisma.chatRoom.create({
      data: {
        type: 'DISPUTE',
        transactionId,
        participants: {
          connect: [{ id: buyerId }, { id: sellerId }], // Admis can access by role
        },
      },
      include: { participants: true },
    });

    this.emitEvent({
      type: 'room_updated',
      roomId: room.id,
      participantIds: room.participants.map((participant) => participant.id),
      room,
      createdAt: new Date().toISOString(),
    });

    return room;
  }

  async sendMessage(roomId: string, senderId: string, content: string) {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new BadRequestException('Message content cannot be empty');
    }
    if (trimmedContent.length > 4000) {
      throw new BadRequestException('Message content is too long');
    }
    assertAcceptableUserContent(trimmedContent, 'Message');

    const access = await this.getAccessibleRoom(roomId, senderId);

    const message = await this.prisma.message.create({
      data: {
        content: trimmedContent,
        roomId,
        senderId,
      },
      include: CHAT_MESSAGE_INCLUDE,
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
        (p) => p.id !== senderId,
      );

      void Promise.allSettled(
        otherParticipants.map((p) =>
          this.notificationsService.sendPushNotification(
            p.id,
            `Новое сообщение от ${message.sender?.displayName || 'Пользователя'}`,
            trimmedContent,
            { roomId },
          ),
        ),
      );
    }

    const participantIds = this.mergeParticipantIds(
      access.participantIds,
      senderId,
    );
    const createdAt = new Date().toISOString();
    this.emitEvent({
      type: 'message_created',
      roomId,
      actorId: senderId,
      participantIds,
      message,
      createdAt,
    });
    this.emitEvent({
      type: 'room_updated',
      roomId,
      actorId: senderId,
      participantIds,
      createdAt,
    });

    return message;
  }

  async markAsRead(roomId: string, userId: string) {
    const access = await this.getAccessibleRoom(roomId, userId);
    const result = await this.prisma.message.updateMany({
      where: { roomId, isRead: false, senderId: { not: userId } },
      data: { isRead: true },
    });

    if (result.count > 0) {
      this.emitEvent({
        type: 'messages_read',
        roomId,
        actorId: userId,
        participantIds: this.mergeParticipantIds(access.participantIds, userId),
        readCount: result.count,
        createdAt: new Date().toISOString(),
      });
    }

    return { success: true, count: result.count, roomId };
  }

  async setTyping(roomId: string, userId: string, isTyping = true) {
    const access = await this.getAccessibleRoom(roomId, userId);
    const expiresAt = new Date(Date.now() + 5000).toISOString();

    this.emitEvent({
      type: 'typing',
      roomId,
      actorId: userId,
      participantIds: this.mergeParticipantIds(access.participantIds, userId),
      isTyping,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    return { success: true, roomId, isTyping, expiresAt };
  }

  subscribeToEvents(
    userId: string,
    role?: string,
  ): Observable<{ data: ChatRealtimeEvent }> {
    return this.events$.pipe(
      filter(
        (event) => role === 'ADMIN' || event.participantIds.includes(userId),
      ),
      map((event) => ({ data: event })),
    );
  }

  private async getAccessibleRoom(roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          select: { id: true },
        },
        transaction: {
          include: CHAT_TRANSACTION_INCLUDE,
        },
      },
    });

    if (!room) throw new NotFoundException('Room not found');

    const userRecord = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isAdmin = userRecord?.role === 'ADMIN';
    const participantIds = room.participants.map(
      (participant) => participant.id,
    );

    if (!isAdmin && !participantIds.includes(userId)) {
      throw new ForbiddenException('Access denied to this chat room');
    }
    if (!isAdmin && room.type === 'DIRECT') {
      const otherUserId = participantIds.find((id) => id !== userId);
      if (otherUserId) {
        await this.ensureUsersCanInteract(userId, otherUserId);
      }
    }

    return { room, isAdmin, participantIds };
  }

  private async blockedUserIds(userId: string) {
    const rows = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    return rows.map((row) =>
      row.blockerId === userId ? row.blockedId : row.blockerId,
    );
  }

  private async ensureUsersCanInteract(userId1: string, userId2: string) {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 },
        ],
      },
      select: { id: true },
    });
    if (block) {
      throw new ForbiddenException('Direct interaction is blocked');
    }
  }

  private buildTransactionSummary(
    transaction: {
      id: string;
      offerId: string;
      buyerId: string;
      price: number;
      status: string;
      isGift: boolean;
      isRedeemed: boolean;
      expiresAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      offer: {
        id: string;
        title: string;
        price: number;
        category: string;
        vendorLogo: string | null;
        sellerId: string;
      };
      dispute: {
        id: string;
        status: string;
        reason: string;
        createdAt: Date;
      } | null;
    },
    userId: string,
    role?: string,
  ) {
    const roleForUser =
      role === 'ADMIN'
        ? 'ADMIN'
        : transaction.buyerId === userId
          ? 'BUYER'
          : transaction.offer.sellerId === userId
            ? 'SELLER'
            : 'PARTICIPANT';

    return {
      id: transaction.id,
      offerId: transaction.offerId,
      buyerId: transaction.buyerId,
      sellerId: transaction.offer.sellerId,
      price: transaction.price,
      status: transaction.status,
      isGift: transaction.isGift,
      isRedeemed: transaction.isRedeemed,
      expiresAt: transaction.expiresAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      roleForUser,
      offer: {
        id: transaction.offer.id,
        title: transaction.offer.title,
        price: transaction.offer.price,
        category: transaction.offer.category,
        vendorLogo: transaction.offer.vendorLogo,
      },
      dispute: transaction.dispute,
    };
  }

  private getRoomStatus(
    roomType: string,
    transactionSummary: ReturnType<
      ChatService['buildTransactionSummary']
    > | null,
  ) {
    if (roomType === 'DISPUTE') return 'ARBITRATION';
    if (!transactionSummary) return 'ACTIVE';

    switch (transactionSummary.status) {
      case 'DISPUTED':
        return 'DISPUTE';
      case 'ESCROW':
      case 'PAID':
        return 'ESCROW';
      case 'COMPLETED':
      case 'SUCCESS':
      case 'ACTIVATED':
        return 'COMPLETED';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'CLOSED';
      default:
        return 'ACTIVE';
    }
  }

  private normalizeSkip(skip: number) {
    return Number.isFinite(skip) && skip > 0 ? Math.floor(skip) : 0;
  }

  private normalizeTake(take: number) {
    if (!Number.isFinite(take)) return 50;
    return Math.min(Math.max(Math.floor(take), 1), 100);
  }

  private mergeParticipantIds(participantIds: string[], actorId: string) {
    return Array.from(new Set([...participantIds, actorId]));
  }

  private emitEvent(event: ChatRealtimeEvent) {
    this.events$.next(event);
  }
}
