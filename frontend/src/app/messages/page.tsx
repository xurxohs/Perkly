'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import api, { ChatRoom, ChatMessage } from '@/lib/api';
import Image from 'next/image';
import { Navbar } from '@/components/Navbar';
import {
    MessageSquare, Send, Paperclip, Search,
    ShieldAlert, Bell, Store, User as UserIcon, Check, CheckCheck
} from 'lucide-react';

export default function MessagesPage() {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();

    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (isAuthenticated) {
            loadRooms();
        }
    }, [isAuthenticated, loading, router]);

    const loadRooms = async () => {
        try {
            const res = await api.chat.getRooms();
            setRooms(res);
            // Пытаемся взять комнату по умолчанию (например из query)
            // Но пока просто берём первую, если ничего не выбрано
        } catch (error) {
            console.error('Failed to load rooms:', error);
        }
    };

    const loadMessages = async (roomId: string) => {
        try {
            const res = await api.chat.getMessages(roomId);
            setMessages(res.data.reverse());
            await api.chat.markAsRead(roomId);

            setRooms(prev => prev.map(r =>
                r.id === roomId
                    ? { ...r, messages: (r.messages || []).map((m) => ({ ...m, isRead: true })) }
                    : r
            ));
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    useEffect(() => {
        if (activeRoomId) {
            loadMessages(activeRoomId);
        } else {
            setMessages([]);
        }
    }, [activeRoomId]);

    useEffect(() => {
        // Прокрутка вниз при новых сообщениях
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !activeRoomId || isSending) return;

        setIsSending(true);
        try {
            const newMessage = await api.chat.sendMessage(activeRoomId, inputValue);
            setMessages(prev => [...prev, newMessage]);
            setInputValue('');

            // Подтягиваем превью в списке комнат
            setRooms(prev => prev.map(r =>
                r.id === activeRoomId
                    ? { ...r, messages: [newMessage], updatedAt: new Date().toISOString() }
                    : r
            ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));

        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (loading || !isAuthenticated) {
        return <div className="min-h-screen bg-[#0a0f1c]" />;
    }

    const activeRoom = rooms.find(r => r.id === activeRoomId);

    // Вспомогательная функция: получает имя/аватар собеседника для DIRECT-чатов
    const getOtherParticipant = (room: ChatRoom) => {
        return room.participants?.find((p) => p.id !== user?.id) || null;
    };

    // Определение стиля иконки комнаты
    const getRoomStyle = (room: ChatRoom) => {
        switch (room.type) {
            case 'SYSTEM': return { icon: Bell, border: 'border-green-500/50', bg: 'bg-green-500/10', text: 'text-green-500' };
            case 'DISPUTE': return { icon: ShieldAlert, border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-500' };
            case 'DIRECT':
            default: return { icon: UserIcon, border: 'border-purple-500/50', bg: 'bg-purple-500/10', text: 'text-purple-500' };
        }
    };

    // Определение названия комнаты
    const getRoomName = (room: ChatRoom) => {
        if (room.type === 'SYSTEM') return 'Perkly Уведомления';
        if (room.type === 'DISPUTE') return `Спор #${room.transactionId?.slice(-6) || '??'}`;
        const other = getOtherParticipant(room);
        return other?.displayName || other?.email || 'Неизвестный пользователь';
    };

    return (
        <div className="min-h-screen bg-[#0a0f1c] flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex gap-6 h-[calc(100vh-80px)]">

                {/* Left Sidebar - Chat List */}
                <div className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl transition-all h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5">
                        <h2 className="text-xl font-bold text-white mb-4">Сообщения</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                placeholder="Поиск чатов..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Room List */}
                    <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
                        {rooms.length === 0 ? (
                            <div className="p-8 text-center text-white/40 text-sm">
                                У вас пока нет чатов
                            </div>
                        ) : (
                            rooms.map((room) => {
                                const active = room.id === activeRoomId;
                                const { icon: RoomIcon, bg, border, text } = getRoomStyle(room);
                                const otherUser = getOtherParticipant(room);
                                const lastMessage = room.messages?.[0];

                                // Непрочитанные сообщения от других отправителей
                                const hasUnread = lastMessage && !lastMessage.isRead && lastMessage.senderId !== user?.id;

                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => setActiveRoomId(room.id)}
                                        className={`w-full flex block text-left p-4 gap-4 items-center transition-all border-b border-white/5 last:border-0 relative
                                            ${active ? 'bg-white/10' : 'hover:bg-white/5'}
                                        `}
                                    >
                                        {/* Avatar */}
                                        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${bg} border ${border}`}>
                                            {otherUser?.avatarUrl && room.type === 'DIRECT' ? (
                                                <Image src={otherUser.avatarUrl} alt="Avatar" width={48} height={48} className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <RoomIcon className={`w-5 h-5 ${text}`} />
                                            )}
                                            {room.type === 'DIRECT' && otherUser?.role === 'VENDOR' && (
                                                <div className="absolute -bottom-1 -right-1 bg-[#0a0f1c] rounded-full p-0.5">
                                                    <Store className="w-3.5 h-3.5 text-blue-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-semibold text-white truncate text-sm">
                                                    {getRoomName(room)}
                                                </span>
                                                <span className="text-[10px] text-white/40 flex-shrink-0 ml-2">
                                                    {lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <p className={`text-xs truncate ${hasUnread ? 'text-white font-medium' : 'text-white/50'}`}>
                                                    {lastMessage
                                                        ? (lastMessage.senderId === user?.id ? 'Вы: ' + lastMessage.content : lastMessage.content)
                                                        : 'Нет сообщений'
                                                    }
                                                </p>
                                                {/* Unread dot */}
                                                {hasUnread && (
                                                    <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 shadow-[0_0_10px_theme(colors.purple.500)]" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Pane - Chat Window */}
                <div className={`flex-1 hidden md:flex flex-col bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl relative ${activeRoomId ? '' : 'items-center justify-center'}`}>

                    {!activeRoomId ? (
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                                <MessageSquare className="w-8 h-8 text-white/20" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Выберите чат</h3>
                            <p className="text-white/40">Нажмите на диалог слева, чтобы начать общение</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${getRoomStyle(activeRoom!).border} ${getRoomStyle(activeRoom!).bg}`}>
                                        {React.createElement(getRoomStyle(activeRoom!).icon, { className: `w-5 h-5 ${getRoomStyle(activeRoom!).text}` })}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white leading-tight">{getRoomName(activeRoom!)}</h3>
                                        <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                                            {activeRoom?.type === 'DISPUTE' && activeRoom.transaction && (
                                                <span className="text-red-400">Транзакция ${activeRoom.transaction.price}</span>
                                            )}
                                            {activeRoom?.type === 'DIRECT' && 'Онлайн'}
                                            {activeRoom?.type === 'SYSTEM' && 'Официальные рассылки'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                {messages.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-white/30 text-sm">
                                        Здесь пока нет сообщений
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isMine = msg.senderId === user?.id;
                                        const isSystem = msg.senderId === null;

                                        if (isSystem) {
                                            return (
                                                <div key={msg.id} className="flex justify-center my-6">
                                                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs text-center text-white font-medium max-w-sm">
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                {/* Left avatar if not mine */}
                                                {!isMine && (
                                                    <div className="w-8 h-8 rounded-full bg-white/10 mr-2 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10 mt-auto">
                                                        {msg.sender?.avatarUrl ? (
                                                            <Image src={msg.sender.avatarUrl} alt="Avatar" width={32} height={32} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <UserIcon className="w-4 h-4 text-white/50" />
                                                        )}
                                                    </div>
                                                )}

                                                <div className={`max-w-[70%] ${isMine ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                                                    {/* Bubble */}
                                                    <div className={`
                                                        px-4 py-3 rounded-2xl relative
                                                        ${isMine
                                                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 rounded-br-sm text-white shadow-[0_4px_15px_rgba(147,51,234,0.3)]'
                                                            : 'bg-white/10 backdrop-blur-md border border-white/10 rounded-bl-sm text-white/90'
                                                        }
                                                    `}>
                                                        {activeRoom?.type === 'DISPUTE' && !isMine && msg.sender?.role === 'ADMIN' && (
                                                            <div className="text-[10px] uppercase font-bold text-red-400 mb-1">Администратор</div>
                                                        )}
                                                        {activeRoom?.type === 'DISPUTE' && !isMine && msg.sender?.role !== 'ADMIN' && (
                                                            <div className="text-[10px] font-bold text-purple-400 mb-1">{msg.sender?.displayName || msg.sender?.email}</div>
                                                        )}

                                                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                                    </div>

                                                    {/* Time & Read Status */}
                                                    <div className={`text-[10px] text-white/30 mt-1 flex items-center gap-1 px-1`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isMine && (
                                                            msg.isRead ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            {activeRoom?.type !== 'SYSTEM' && (
                                <div className="p-4 bg-white/[0.02] border-t border-white/5 relative z-10 backdrop-blur-xl">
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                        <button type="button" title="Прикрепить файл" className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors">
                                            <Paperclip className="w-5 h-5" />
                                        </button>
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="Введите сообщение..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputValue.trim() || isSending}
                                            className="p-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all disabled:opacity-50 border-0 cursor-pointer flex items-center justify-center min-w-[3rem]"
                                        >
                                            {isSending ? (
                                                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Send className="w-5 h-5 ml-1" />
                                            )}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </>
                    )}
                </div>

            </main>
        </div>
    );
}
