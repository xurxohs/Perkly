'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Image as ImageIcon, Smile, MoreVertical, Flame } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/hooks/useTelegram';

type Message = {
    id: string;
    text: string;
    sender: 'me' | 'other';
    author?: string;
    time: string;
    avatar?: string;
};

const INITIAL_MESSAGES: Message[] = [
    { id: '1', text: 'Всем привет! Кто идет на Electric Nights?', sender: 'other', author: 'Алексей', time: '14:20', avatar: 'bg-blue-500' },
    { id: '2', text: 'Я иду! Взял VIP билеты 🚀', sender: 'other', author: 'Мария', time: '14:22', avatar: 'bg-purple-500' },
    { id: '3', text: 'Давайте соберемся у главного входа в 18:30?', sender: 'other', author: 'Алексей', time: '14:23', avatar: 'bg-blue-500' },
];

export default function ChatPage() {
    const router = useRouter();
    const { hapticImpact } = useTelegram();
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        hapticImpact('light');
        const newMessage: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages([...messages, newMessage]);
        setInput('');

        // Simulate reply after 2 seconds
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now().toString() + 'reply',
                text: 'Отличная идея! Я скину геолокацию как буду подходить.',
                sender: 'other',
                author: 'Мария',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                avatar: 'bg-purple-500'
            }]);
            hapticImpact('medium');
        }, 2000);
    };

    return (
        <div className="flex flex-col min-h-screen bg-black">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 pt-safe">
                <div className="px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.back()} 
                            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition text-white/70"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        
                        <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                                <Flame className="w-5 h-5 text-white" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full" />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-[16px] font-bold leading-tight pb-0.5">Electric Nights</h2>
                                <span className="text-[12px] text-white/50 leading-tight">124 участника онлайн</span>
                            </div>
                        </div>
                    </div>

                    <button className="p-2 rounded-full hover:bg-white/10 transition text-white/70">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5 pb-32">
                <div className="text-center w-full">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 text-white/40">
                        Сегодня
                    </span>
                </div>

                {messages.map((msg, i) => {
                    const isMe = msg.sender === 'me';
                    const showAuthor = !isMe && (i === 0 || messages[i - 1].author !== msg.author);
                    
                    return (
                        <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {!isMe && (
                                <div className="w-8 flex-shrink-0 mr-2 flex flex-col justify-end pb-1">
                                    {showAuthor ? (
                                        <div className={`w-8 h-8 rounded-full ${msg.avatar} flex items-center justify-center shadow-lg`}>
                                            <span className="text-[10px] font-bold">{msg.author?.[0]}</span>
                                        </div>
                                    ) : (
                                        <div className="w-8" />
                                    )}
                                </div>
                            )}

                            <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                {showAuthor && (
                                    <span className="text-[11px] font-semibold text-white/60 mb-1 ml-1">{msg.author}</span>
                                )}
                                
                                <div className={`relative px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm
                                    ${isMe 
                                        ? 'bg-purple-600 text-white rounded-br-sm' 
                                        : 'bg-[#1c1c1e] text-white/90 rounded-bl-sm border border-white/5'
                                    }`}
                                >
                                    {msg.text}
                                    <span className={`block text-[10px] mt-1 ${isMe ? 'text-purple-200' : 'text-white/40'} ${isMe ? 'text-right' : 'text-left'}`}>
                                        {msg.time}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 pb-safe z-50">
                <form onSubmit={handleSend} className="px-2 py-3 flex items-end gap-2">
                    <button type="button" className="p-2.5 text-white/40 hover:text-white/70 transition-colors">
                        <ImageIcon className="w-6 h-6" />
                    </button>
                    
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl flex items-end pr-2 overflow-hidden shadow-inner">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Сообщение чату..."
                            className="w-full bg-transparent text-white text-[15px] py-3.5 px-3 outline-none resize-none max-h-[120px] min-h-[50px]"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                        />
                        <button type="button" className="p-3 text-white/40 hover:text-white/70 transition-colors">
                            <Smile className="w-5 h-5" />
                        </button>
                    </div>

                    <button 
                        type="submit" 
                        disabled={!input.trim()}
                        className={`p-3 rounded-full flex items-center justify-center transition-all shadow-lg
                            ${input.trim() 
                                ? 'bg-purple-600 text-white hover:bg-purple-500 scale-100 shadow-[0_4px_15px_rgba(147,51,234,0.4)]' 
                                : 'bg-white/5 text-white/20 scale-95'
                            }`}
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
