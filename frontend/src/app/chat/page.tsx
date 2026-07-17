'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Check,
    CheckCheck,
    Flame,
    Loader2,
    MessageSquare,
    Send,
    User as UserIcon,
    X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api, { ChatMessage, ChatRealtimeEvent, ChatRoom, User } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useTelegram } from '@/hooks/useTelegram';

const ROOM_TITLES: Record<ChatRoom['type'], string> = {
    DIRECT: 'Личный чат',
    SUPPORT: 'Поддержка',
    SYSTEM: 'Уведомления',
    DISPUTE: 'Арбитраж',
};

function mergeMessage(list: ChatMessage[], message: ChatMessage) {
    if (list.some((item) => item.id === message.id)) return list;
    return [...list, message].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

function getMessageTime(value: string) {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDisplayName(user?: Pick<User, 'displayName' | 'email'> | null) {
    return user?.displayName || user?.email || 'Пользователь';
}

export default function ChatPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading } = useAuth();
    const { hapticImpact } = useTelegram();

    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoadingRooms, setIsLoadingRooms] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [typingByRoom, setTypingByRoom] = useState<Record<string, string | null>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const activeRoomIdRef = useRef<string | null>(null);
    const roomsRef = useRef<ChatRoom[]>([]);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeRoom = useMemo(
        () => rooms.find((room) => room.id === activeRoomId) ?? null,
        [rooms, activeRoomId],
    );

    const otherParticipant = useMemo(() => {
        if (!activeRoom) return null;
        return activeRoom.participants?.find((participant) => participant.id !== user?.id) ?? null;
    }, [activeRoom, user?.id]);

    const roomTitle = useMemo(() => {
        if (!activeRoom) return 'Чат';
        if (activeRoom.type === 'DIRECT') return getDisplayName(otherParticipant);
        if (activeRoom.type === 'DISPUTE') return `Спор #${activeRoom.transactionId?.slice(-6) || activeRoom.id.slice(-6)}`;
        return ROOM_TITLES[activeRoom.type];
    }, [activeRoom, otherParticipant]);

    const roomSubtitle = useMemo(() => {
        if (!activeRoom) return 'Нет выбранного диалога';
        const typingName = typingByRoom[activeRoom.id];
        if (typingName) return `${typingName} печатает...`;
        if (activeRoom.type === 'DIRECT') return otherParticipant?.role === 'VENDOR' ? 'Продавец' : 'Онлайн';
        if (activeRoom.type === 'DISPUTE') return 'Переписка по заказу';
        return ROOM_TITLES[activeRoom.type];
    }, [activeRoom, otherParticipant?.role, typingByRoom]);

    const loadRooms = useCallback(async () => {
        setIsLoadingRooms(true);
        setError(null);
        try {
            const response = await api.chat.getRooms({ take: 50 });
            setRooms(response.data);
            setActiveRoomId((current) => current ?? response.data[0]?.id ?? null);
        } catch (loadError) {
            console.error('Failed to load chat rooms:', loadError);
            setError('Не удалось загрузить чаты');
        } finally {
            setIsLoadingRooms(false);
        }
    }, []);

    const loadMessages = useCallback(async (roomId: string) => {
        setIsLoadingMessages(true);
        setError(null);
        try {
            const response = await api.chat.getMessages(roomId, { take: 80 });
            setMessages([...response.data].reverse());
            await api.chat.markAsRead(roomId);
            setRooms((currentRooms) =>
                currentRooms.map((room) =>
                    room.id === roomId
                        ? {
                            ...room,
                            unreadCount: 0,
                            messages: room.messages?.map((message) => ({ ...message, isRead: true })),
                        }
                        : room,
                ),
            );
        } catch (loadError) {
            console.error('Failed to load chat messages:', loadError);
            setError('Не удалось загрузить сообщения');
        } finally {
            setIsLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
            return;
        }
        if (isAuthenticated) {
            void loadRooms();
        }
    }, [isAuthenticated, loadRooms, loading, router]);

    useEffect(() => {
        activeRoomIdRef.current = activeRoomId;
        if (activeRoomId) {
            void loadMessages(activeRoomId);
        } else {
            setMessages([]);
        }
    }, [activeRoomId, loadMessages]);

    useEffect(() => {
        roomsRef.current = rooms;
    }, [rooms]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoadingMessages]);

    useEffect(() => {
        if (!isAuthenticated) return;

        return api.chat.subscribeToEvents(
            (event: ChatRealtimeEvent) => {
                if (event.type === 'message_created') {
                    if (event.roomId === activeRoomIdRef.current) {
                        setMessages((currentMessages) => mergeMessage(currentMessages, event.message));
                        if (event.actorId !== user?.id) {
                            void api.chat.markAsRead(event.roomId);
                            hapticImpact('medium');
                        }
                    }

                    setRooms((currentRooms) =>
                        currentRooms.map((room) =>
                            room.id === event.roomId
                                ? {
                                    ...room,
                                    messages: [event.message],
                                    unreadCount:
                                        event.roomId === activeRoomIdRef.current || event.actorId === user?.id
                                            ? 0
                                            : (room.unreadCount ?? 0) + 1,
                                    updatedAt: event.createdAt,
                                }
                                : room,
                        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
                    );
                }

                if (event.type === 'messages_read' && event.actorId !== user?.id) {
                    setMessages((currentMessages) =>
                        currentMessages.map((message) =>
                            message.roomId === event.roomId && message.senderId === user?.id
                                ? { ...message, isRead: true }
                                : message,
                        ),
                    );
                }

                if (event.type === 'typing' && event.actorId !== user?.id) {
                    const room = roomsRef.current.find((item) => item.id === event.roomId);
                    const actor = room?.participants?.find((participant) => participant.id === event.actorId);
                    setTypingByRoom((current) => ({
                        ...current,
                        [event.roomId]: event.isTyping ? getDisplayName(actor) : null,
                    }));

                    window.setTimeout(() => {
                        setTypingByRoom((current) => ({ ...current, [event.roomId]: null }));
                    }, 5000);
                }

                if (event.type === 'room_updated' && event.room) {
                    setRooms((currentRooms) => {
                        const nextRooms = currentRooms.some((room) => room.id === event.roomId)
                            ? currentRooms.map((room) => room.id === event.roomId ? { ...room, ...event.room } : room)
                            : [event.room as ChatRoom, ...currentRooms];

                        return nextRooms.sort(
                            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                        );
                    });
                }
            },
            (streamError) => {
                console.error('Chat events stream failed:', streamError);
            },
        );
    }, [hapticImpact, isAuthenticated, user?.id]);

    const handleInputChange = (value: string) => {
        setInput(value);
        if (!activeRoomId || activeRoom?.type === 'SYSTEM') return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        } else {
            void api.chat.setTyping(activeRoomId, true);
        }

        typingTimeoutRef.current = setTimeout(() => {
            if (activeRoomIdRef.current) {
                void api.chat.setTyping(activeRoomIdRef.current, false);
            }
            typingTimeoutRef.current = null;
        }, 1200);
    };

    const handleSend = async (event: FormEvent) => {
        event.preventDefault();
        const content = input.trim();
        if (!content || !activeRoomId || isSending || activeRoom?.type === 'SYSTEM') return;

        setIsSending(true);
        setError(null);
        try {
            hapticImpact('light');
            const newMessage = await api.chat.sendMessage(activeRoomId, content);
            setMessages((currentMessages) => mergeMessage(currentMessages, newMessage));
            setRooms((currentRooms) =>
                currentRooms.map((room) =>
                    room.id === activeRoomId
                        ? { ...room, messages: [newMessage], updatedAt: newMessage.createdAt, unreadCount: 0 }
                        : room,
                ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
            );
            setInput('');
            void api.chat.setTyping(activeRoomId, false);
        } catch (sendError) {
            console.error('Failed to send chat message:', sendError);
            setError('Сообщение не отправлено');
        } finally {
            setIsSending(false);
        }
    };

    if (loading || (isAuthenticated && isLoadingRooms)) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white/50">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="chat-shell flex flex-col min-h-screen bg-black text-white">
            <div className="chat-header sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl pt-safe">
                <div className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="chat-close p-2 -ml-2 rounded-full hover:bg-white/10 transition text-white/70 border-0 bg-transparent"
                            aria-label="Назад"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 min-w-0">
                            <div className="chat-avatar relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                {activeRoom?.type === 'DIRECT' ? (
                                    <UserIcon className="w-5 h-5 text-white" />
                                ) : activeRoom?.type === 'DISPUTE' ? (
                                    <MessageSquare className="w-5 h-5 text-white" />
                                ) : (
                                    <Flame className="w-5 h-5 text-white" />
                                )}
                                {activeRoom?.type === 'DIRECT' && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h2 className="text-[16px] font-bold leading-tight pb-0.5 truncate">{roomTitle}</h2>
                                <span className="text-[12px] text-white/50 leading-tight truncate">{roomSubtitle}</span>
                            </div>
                        </div>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-[.14em] text-white/25">Perkly Chat</span>
                </div>

                {rooms.length > 1 && (
                    <div className="px-3 pb-3 flex gap-2 overflow-x-auto">
                        {rooms.map((room) => {
                            const active = room.id === activeRoomId;
                            const participant = room.participants?.find((item) => item.id !== user?.id);
                            const title = room.type === 'DIRECT'
                                ? getDisplayName(participant)
                                : room.type === 'DISPUTE'
                                    ? `Спор #${room.transactionId?.slice(-6) || room.id.slice(-6)}`
                                    : ROOM_TITLES[room.type];

                            return (
                                <button
                                    key={room.id}
                                    type="button"
                                    onClick={() => setActiveRoomId(room.id)}
                                    className={`h-9 max-w-44 px-3 rounded-full border text-xs font-semibold whitespace-nowrap truncate transition ${
                                        active
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent'
                                            : 'bg-white/5 text-white/60 border-transparent'
                                    }`}
                                >
                                    {room.unreadCount ? `${title} · ${room.unreadCount}` : title}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="chat-messages flex-1 overflow-y-auto px-3 sm:px-4 py-5 flex flex-col gap-3 pb-48 md:pb-28">
                {error && (
                    <div className="self-center text-xs font-semibold px-3 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                        {error}
                    </div>
                )}

                {!activeRoomId && !isLoadingRooms && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-white/40 gap-3">
                        <MessageSquare className="w-8 h-8" />
                        <p className="text-sm">У вас пока нет активных чатов</p>
                    </div>
                )}

                {activeRoomId && isLoadingMessages && (
                    <div className="flex-1 flex items-center justify-center text-white/40">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                )}

                {activeRoomId && !isLoadingMessages && messages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-white/40 gap-3">
                        <MessageSquare className="w-8 h-8" />
                        <p className="text-sm">Здесь пока нет сообщений</p>
                    </div>
                )}

                {messages.map((message, index) => {
                    const isMine = message.senderId === user?.id;
                    const previousMessage = messages[index - 1];
                    const authorName = getDisplayName(message.sender);
                    const showAuthor = !isMine && previousMessage?.senderId !== message.senderId;

                    return (
                        <div key={message.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {!isMine && (
                                <div className="w-8 flex-shrink-0 mr-2 flex flex-col justify-end pb-1">
                                    {showAuthor ? (
                                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shadow-lg">
                                            <span className="text-[10px] font-bold">{authorName[0]?.toUpperCase()}</span>
                                        </div>
                                    ) : (
                                        <div className="w-8" />
                                    )}
                                </div>
                            )}

                            <div className={`flex flex-col max-w-[82%] sm:max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                                {showAuthor && (
                                    <span className="text-[11px] font-semibold text-white/60 mb-1 ml-1">{authorName}</span>
                                )}

                                <div className={`chat-bubble relative px-4 py-2.5 rounded-[20px] text-[15px] leading-relaxed ${
                                    isMine
                                        ? 'is-mine bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-br-md'
                                        : 'is-other bg-[#1c1c1e] text-white/90 rounded-bl-md'
                                }`}
                                >
                                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                    <span className={`flex items-center gap-1 text-[10px] mt-1 ${isMine ? 'text-purple-200 justify-end' : 'text-white/40 justify-start'}`}>
                                        {getMessageTime(message.createdAt)}
                                        {isMine && (message.isRead ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-composer fixed bottom-[70px] md:bottom-0 left-0 right-0 bg-[#0a0a0a]/88 backdrop-blur-2xl pb-safe z-40">
                <form onSubmit={handleSend} className="mx-auto max-w-3xl px-3 py-2.5 flex items-end gap-2">
                    <div className="chat-input flex-1 bg-white/7 rounded-[22px] flex items-end pr-2 overflow-hidden">
                        <textarea
                            value={input}
                            onChange={(event) => handleInputChange(event.target.value)}
                            placeholder={activeRoom?.type === 'SYSTEM' ? 'Системный чат только для чтения' : 'Сообщение...'}
                            disabled={!activeRoomId || activeRoom?.type === 'SYSTEM'}
                            className="w-full bg-transparent border-0 text-white text-[15px] py-3 px-4 outline-none resize-none max-h-[120px] min-h-[48px] disabled:opacity-50"
                            rows={1}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    void handleSend(event);
                                }
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!input.trim() || !activeRoomId || isSending || activeRoom?.type === 'SYSTEM'}
                        className={`h-12 w-12 rounded-full border-0 flex items-center justify-center transition-all ${
                            input.trim() && activeRoomId && activeRoom?.type !== 'SYSTEM'
                                ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-100'
                                : 'bg-white/5 text-white/20 scale-95'
                        }`}
                        aria-label="Отправить"
                    >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
