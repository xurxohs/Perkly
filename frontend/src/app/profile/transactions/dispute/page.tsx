'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, AlertTriangle, Shield, CheckCircle, Clock } from 'lucide-react';
import api from '@/lib/api';

function DisputeContent() {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [dispute, setDispute] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchDispute = async () => {
        try {
            const { data } = await api.get(`/disputes/${id}`) as any;
            setDispute(data);
            setMessages(data.messages || []);
        } catch (err) {
            console.error('Failed to fetch dispute', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/auth/login');
            return;
        }

        if (isAuthenticated && id) {
            fetchDispute();
            // Simple polling for a "live" feel (in a real app, use WebSockets)
            const interval = setInterval(fetchDispute, 5000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, loading, id, router]);

    useEffect(() => {
        // Scroll to bottom when messages update
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            await api.post(`/disputes/${id}/messages`, {
                text: newMessage
            });
            setNewMessage('');
            fetchDispute(); // Refresh immediately
        } catch (err) {
            console.error('Failed to send message', err);
        } finally {
            setIsSending(false);
        }
    };

    const handleResolve = async (status: 'RESOLVED' | 'CLOSED') => {
        if (!confirm(`Вы уверены, что хотите ${status === 'RESOLVED' ? 'закрыть спор в пользу продавца' : 'отменить сделку и вернуть деньги'}?`)) {
            return;
        }

        try {
            await api.patch(`/disputes/${id}/resolve`, { status });
            fetchDispute();
        } catch (err) {
            console.error('Failed to resolve dispute', err);
            alert('Ошибка при разрешении спора');
        }
    };

    if (loading || isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!dispute) {
        return (
            <div className="flex justify-center items-center min-h-[60vh] text-white">
                Спор не найден или у вас нет к нему доступа.
            </div>
        );
    }

    const isSellerOrAdmin = user?.role === 'ADMIN' || user?.userId === dispute.transaction.offer.sellerId;
    const isClosed = dispute.status === 'RESOLVED' || dispute.status === 'CLOSED';

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="glass-card p-6 mb-4 shrink-0 border-l-4 border-l-red-500">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                            <h1 className="text-2xl font-bold text-white">Спор по заказу #{dispute.transaction.id.substring(0, 8)}</h1>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${dispute.status === 'OPEN' ? 'bg-yellow-500/20 text-yellow-500' :
                                dispute.status === 'RESOLVED' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                {dispute.status}
                            </span>
                        </div>
                        <p className="text-gray-400">Товар: <span className="text-white font-medium">{dispute.transaction.offer.title}</span></p>
                        <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                            <p className="text-sm text-gray-300"><strong className="text-white">Причина спора:</strong> {dispute.reason}</p>
                        </div>
                    </div>

                    {/* Action Buttons for Seller/Admin */}
                    {isSellerOrAdmin && !isClosed && (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <button onClick={() => handleResolve('RESOLVED')} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Закрыть (Товар выдан)
                            </button>
                            <button onClick={() => handleResolve('CLOSED')} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Отменить сделку
                            </button>
                            {user?.role === 'ADMIN' && (
                                <p className="text-xs text-center text-red-400 mt-2 flex items-center justify-center gap-1">
                                    <Shield className="w-3 h-3" /> Права Администратора
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Box */}
            <div className="glass-card flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <Shield className="w-12 h-12 mb-4 opacity-20" />
                            <p>Чат пуст. Опишите проблему подробнее.</p>
                        </div>
                    ) : (
                        messages.map((msg: any) => {
                            const isMine = msg.senderId === user?.userId;
                            const isAdmin = msg.sender.role === 'ADMIN';
                            const isSeller = msg.senderId === dispute.transaction.offer.sellerId;

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-end gap-2 mb-1">
                                        {!isMine && (
                                            <div className={`text-xs px-2 py-0.5 rounded text-white mb-1 ${isAdmin ? 'bg-red-500/80' : isSeller ? 'bg-purple-500/80' : 'bg-blue-500/80'}`}>
                                                {isAdmin ? 'Администратор' : isSeller ? 'Продавец' : 'Покупатель'}
                                            </div>
                                        )}
                                        <span className="text-xs text-gray-500 px-1">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${isMine ? 'bg-purple-600 text-white rounded-br-sm' :
                                        isAdmin ? 'bg-red-500/20 border border-red-500/30 text-white rounded-bl-sm' :
                                            isSeller ? 'bg-white/10 border border-white/5 text-white rounded-bl-sm' :
                                                'bg-blue-500/20 border border-blue-500/30 text-white rounded-bl-sm'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-black/40">
                    {isClosed ? (
                        <div className="text-center text-gray-400 py-3 bg-white/5 rounded-xl">
                            Этот спор был закрыт. Вы больше не можете отправлять сообщения.
                        </div>
                    ) : (
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Введи сообщение..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                disabled={isSending}
                            />
                            <button
                                type="submit"
                                disabled={isSending || !newMessage.trim()}
                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                            >
                                {isSending ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DisputePage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh] animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full" />}>
            <DisputeContent />
        </Suspense>
    );
}
