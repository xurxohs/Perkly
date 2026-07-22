'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    Bell,
    Check,
    CheckCheck,
    ChevronRight,
    Loader2,
    MessageSquare,
    Package,
    Search,
    Send,
    ShieldCheck,
    User as UserIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api, { ChatMessage, ChatRealtimeEvent, ChatRoom, User } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useTelegram } from '@/hooks/useTelegram';

const ROOM_TITLES: Record<ChatRoom['type'], string> = {
    DIRECT: 'Личный чат',
    SUPPORT: 'Поддержка',
    SYSTEM: 'Уведомления',
    DISPUTE: 'Арбитраж',
};

const TRANSACTION_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Ожидает оплаты',
    PAID: 'Оплачено',
    ESCROW: 'Средства защищены',
    COMPLETED: 'Завершено',
    CANCELLED: 'Отменено',
    REFUNDED: 'Возврат выполнен',
    DISPUTED: 'Открыт спор',
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
    const name = user?.displayName || user?.email || 'Пользователь';
    return name.toLocaleLowerCase('ru') === 'perkly system' ? 'Perkly' : name;
}

export default function ChatPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading } = useAuth();
    const { hapticImpact } = useTelegram();

    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [search, setSearch] = useState('');
    const [roomFilter, setRoomFilter] = useState<'ALL' | 'ORDERS' | 'SUPPORT'>('ALL');
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
            setActiveRoomId((current) => {
                if (current) return current;
                return window.matchMedia('(min-width: 768px)').matches ? response.data[0]?.id ?? null : null;
            });
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

    const filteredRooms = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase('ru');
        return rooms.filter((room) => {
            const participant = room.participants?.find((item) => item.id !== user?.id);
            const title = room.type === 'DIRECT'
                ? getDisplayName(participant)
                : room.type === 'DISPUTE'
                    ? `Спор #${room.transactionId?.slice(-6) || room.id.slice(-6)}`
                    : ROOM_TITLES[room.type];
            const matchesFilter = roomFilter === 'ALL'
                || (roomFilter === 'ORDERS' && Boolean(room.transactionId))
                || (roomFilter === 'SUPPORT' && (room.type === 'SUPPORT' || room.type === 'DISPUTE'));
            return matchesFilter && (!normalizedSearch || title.toLocaleLowerCase('ru').includes(normalizedSearch));
        });
    }, [roomFilter, rooms, search, user?.id]);

    if (loading || (isAuthenticated && isLoadingRooms)) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white/50">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060607] text-white md:p-3">
            <div className="mx-auto flex h-[calc(100dvh-76px)] max-w-[1500px] overflow-hidden bg-[#0b0b0d] md:h-[calc(100dvh-24px)] md:rounded-[30px] md:border md:border-white/[0.08] md:shadow-[0_24px_80px_rgba(0,0,0,.45)]">
                <aside className={`${activeRoomId ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-white/[0.07] bg-[#101012] md:w-[350px] md:border-r`}>
                    <div className="border-b border-white/[0.07] px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] md:pt-5">
                        <div className="mb-4 flex items-center gap-3">
                            <button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-full border-0 bg-white/[0.055] text-white/70 transition hover:bg-white/10" aria-label="Назад">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-[22px] font-extrabold tracking-tight">Чаты</h1>
                                <p className="text-xs text-white/35">Покупки, продавцы и поддержка</p>
                            </div>
                            {rooms.reduce((sum, room) => sum + (room.unreadCount ?? 0), 0) > 0 && (
                                <span className="rounded-full bg-[#ff3b7c] px-2.5 py-1 text-xs font-extrabold">
                                    {rooms.reduce((sum, room) => sum + (room.unreadCount ?? 0), 0)}
                                </span>
                            )}
                        </div>

                        <div className="relative mb-3">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти диалог" className="h-11 w-full rounded-2xl border border-white/[0.07] bg-white/[0.045] pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/28 focus:border-purple-400/30" />
                        </div>

                        <div className="flex gap-2">
                            {([['ALL', 'Все'], ['ORDERS', 'Заказы'], ['SUPPORT', 'Поддержка']] as const).map(([value, label]) => (
                                <button key={value} onClick={() => setRoomFilter(value)} className={`h-8 rounded-full border-0 px-3 text-xs font-bold transition ${roomFilter === value ? 'bg-white text-black' : 'bg-white/[0.055] text-white/45 hover:text-white/75'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {filteredRooms.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.05]"><MessageSquare className="h-6 w-6 text-white/25" /></div>
                                <p className="font-bold text-white/70">Диалогов не найдено</p>
                                <p className="mt-1 text-sm text-white/35">Чат появится после сообщения продавцу или обращения в поддержку.</p>
                            </div>
                        ) : filteredRooms.map((room) => {
                            const participant = room.participants?.find((item) => item.id !== user?.id);
                            const title = room.type === 'DIRECT' ? getDisplayName(participant) : room.type === 'DISPUTE' ? `Спор #${room.transactionId?.slice(-6) || room.id.slice(-6)}` : ROOM_TITLES[room.type];
                            const lastMessage = room.messages?.[0];
                            const active = room.id === activeRoomId;
                            return (
                                <button key={room.id} onClick={() => setActiveRoomId(room.id)} className={`mb-1 flex w-full items-center gap-3 rounded-[20px] border-0 p-3 text-left transition ${active ? 'bg-white/[0.1]' : 'bg-transparent hover:bg-white/[0.055]'}`}>
                                    <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[16px] bg-gradient-to-br from-[#7137ff] to-[#ef3f9d]">
                                        {room.type === 'DIRECT' && participant?.avatarUrl ? <Image src={participant.avatarUrl} alt="" fill sizes="48px" className="object-cover" /> : room.type === 'DISPUTE' ? <ShieldCheck className="h-5 w-5" /> : room.type === 'SYSTEM' ? <Bell className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-center gap-2">
                                            <span className={`min-w-0 flex-1 truncate text-sm ${room.unreadCount ? 'font-extrabold text-white' : 'font-bold text-white/78'}`}>{title}</span>
                                            <time className="shrink-0 text-[10px] text-white/28">{lastMessage ? getMessageTime(lastMessage.createdAt) : ''}</time>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className={`min-w-0 flex-1 truncate text-xs ${room.unreadCount ? 'font-semibold text-white/75' : 'text-white/35'}`}>{lastMessage ? `${lastMessage.senderId === user?.id ? 'Вы: ' : ''}${lastMessage.content}` : room.transactionId ? 'Чат по заказу' : 'Начните диалог'}</p>
                                            {!!room.unreadCount && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#a855f7] px-1 text-[10px] font-extrabold">{room.unreadCount}</span>}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <section className={`${activeRoomId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-[#09090b]`}>
                    {activeRoom ? (
                        <>
                            <header className="flex min-h-[72px] items-center gap-3 border-b border-white/[0.07] bg-[#0d0d0f]/92 px-3 pt-safe backdrop-blur-2xl sm:px-5">
                                <button onClick={() => setActiveRoomId(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-0 bg-white/[0.055] text-white/70 md:hidden" aria-label="К списку чатов"><ArrowLeft className="h-5 w-5" /></button>
                                <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[15px] bg-gradient-to-br from-[#7137ff] to-[#ef3f9d]">
                                    {activeRoom.type === 'DIRECT' && otherParticipant?.avatarUrl ? <Image src={otherParticipant.avatarUrl} alt="" fill sizes="44px" className="object-cover" /> : activeRoom.type === 'DISPUTE' ? <ShieldCheck className="h-5 w-5" /> : activeRoom.type === 'SYSTEM' ? <Bell className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-[15px] font-extrabold sm:text-base">{roomTitle}</h2>
                                    <p className="truncate text-xs text-white/38">{roomSubtitle}</p>
                                </div>
                                {activeRoom.transaction?.offer && <Link href={`/offer/?id=${activeRoom.transaction.offer.id}`} className="hidden items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/65 no-underline transition hover:bg-white/10 sm:flex">Товар <ChevronRight className="h-3.5 w-3.5" /></Link>}
                            </header>

                            {activeRoom.transaction?.offer && (
                                <Link href={`/offer/?id=${activeRoom.transaction.offer.id}`} className="mx-3 mt-3 flex items-center gap-3 rounded-[18px] border border-white/[0.07] bg-white/[0.035] p-3 text-white no-underline xl:hidden">
                                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06]"><Package className="h-5 w-5 text-purple-300" /></div>
                                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{activeRoom.transaction.offer.title}</p><p className="mt-0.5 text-[11px] text-white/35">{activeRoom.transaction.price.toLocaleString('ru-RU')} сум · {TRANSACTION_STATUS_LABELS[activeRoom.transaction.status] ?? activeRoom.transaction.status}</p></div>
                                    <ChevronRight className="h-4 w-4 text-white/25" />
                                </Link>
                            )}

                            <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {error && <div className="mx-auto mb-4 w-fit rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">{error}</div>}
                                {isLoadingMessages ? <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-white/35" /></div> : messages.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center text-center"><div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.05]"><MessageSquare className="h-6 w-6 text-white/25" /></div><p className="font-bold text-white/65">Начните разговор</p><p className="mt-1 max-w-xs text-sm text-white/32">Обсудите детали заказа. Не передавайте пароли и платёжные данные.</p></div>
                                ) : messages.map((message, index) => {
                                    const isMine = message.senderId === user?.id;
                                    const previousMessage = messages[index - 1];
                                    const authorName = getDisplayName(message.sender);
                                    const showAuthor = !isMine && previousMessage?.senderId !== message.senderId;
                                    return (
                                        <div key={message.id} className={`mb-2.5 flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[84%] sm:max-w-[72%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                                                {showAuthor && <span className="mb-1 ml-2 text-[11px] font-semibold text-white/38">{authorName}</span>}
                                                <div className={`px-3.5 py-2.5 text-[14px] leading-relaxed shadow-sm ${isMine ? 'rounded-[20px] rounded-br-[7px] bg-[#7c3cff] text-white' : 'rounded-[20px] rounded-bl-[7px] bg-[#1b1b1f] text-white/88'}`}>
                                                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                                    <span className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${isMine ? 'text-white/60' : 'text-white/28'}`}>{getMessageTime(message.createdAt)}{isMine && (message.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="border-t border-white/[0.07] bg-[#0d0d0f]/94 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl md:pb-3">
                                <form onSubmit={handleSend} className="mx-auto flex max-w-3xl items-end gap-2">
                                    <textarea value={input} onChange={(event) => handleInputChange(event.target.value)} placeholder={activeRoom.type === 'SYSTEM' ? 'Системный чат только для чтения' : 'Напишите сообщение'} disabled={activeRoom.type === 'SYSTEM'} rows={1} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend(event); } }} className="min-h-12 max-h-28 flex-1 resize-none rounded-[20px] border border-white/[0.07] bg-white/[0.055] px-4 py-3 text-[14px] text-white outline-none placeholder:text-white/25 focus:border-purple-400/30 disabled:opacity-45" />
                                    <button type="submit" disabled={!input.trim() || isSending || activeRoom.type === 'SYSTEM'} className="grid h-12 w-12 shrink-0 place-items-center rounded-[17px] border-0 bg-white text-black transition disabled:bg-white/[0.06] disabled:text-white/20" aria-label="Отправить">{isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button>
                                </form>
                            </div>
                        </>
                    ) : <div className="flex h-full flex-col items-center justify-center text-center"><div className="mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-white/[0.045]"><MessageSquare className="h-7 w-7 text-white/22" /></div><h2 className="text-xl font-extrabold">Выберите диалог</h2><p className="mt-2 max-w-xs text-sm text-white/35">Сообщения, детали заказа и поддержка будут в одном месте.</p></div>}
                </section>

                {activeRoom?.transaction?.offer && (
                    <aside className="hidden w-[290px] shrink-0 flex-col border-l border-white/[0.07] bg-[#101012] p-5 xl:flex">
                        <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.14em] text-white/30">Заказ</p>
                        <div className="mb-4 grid aspect-[4/3] place-items-center overflow-hidden rounded-[20px] bg-white/[0.045]">
                            {activeRoom.transaction.offer.imageUrl ? <Image src={activeRoom.transaction.offer.imageUrl} alt="" width={320} height={240} className="h-full w-full object-cover" /> : <Package className="h-8 w-8 text-white/20" />}
                        </div>
                        <h3 className="text-base font-extrabold leading-snug">{activeRoom.transaction.offer.title}</h3>
                        <p className="mt-2 text-xl font-black">{activeRoom.transaction.price.toLocaleString('ru-RU')} сум</p>
                        <div className="mt-4 rounded-2xl bg-white/[0.045] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-white/28">Статус</p><p className="mt-1 text-sm font-bold text-emerald-300">{TRANSACTION_STATUS_LABELS[activeRoom.transaction.status] ?? activeRoom.transaction.status}</p></div>
                        <Link href={`/offer/?id=${activeRoom.transaction.offer.id}`} className="mt-4 flex h-11 items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-black no-underline">Открыть товар</Link>
                        <p className="mt-auto text-xs leading-relaxed text-white/28"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> Переписка хранится в Perkly и может использоваться при рассмотрении спора.</p>
                    </aside>
                )}
            </div>
        </div>
    );
}
