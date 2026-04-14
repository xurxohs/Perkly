'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, MessageCircle, Send, Gem, Medal } from 'lucide-react';
import { reviewsApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import Image from 'next/image';

interface Review {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    author: {
        id: string;
        displayName: string | null;
        avatarUrl: string | null;
        tier: string;
    };
}

export function Reviews({ offerId }: { offerId: string }) {
    const { user, isAuthenticated } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });
    const [loading, setLoading] = useState(true);

    // Form state
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchReviews = useCallback(async () => {
        try {
            const [reviewsData, statsData] = await Promise.all([
                reviewsApi.findByOfferId(offerId) as Promise<Review[]>,
                reviewsApi.getOfferStats(offerId) as Promise<{ averageRating: number; totalReviews: number }>
            ]);
            setReviews(reviewsData);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to fetch reviews', error);
        } finally {
            setLoading(false);
        }
    }, [offerId]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || !user) return;

        setSubmitting(true);
        try {
            await reviewsApi.create({
                rating,
                comment: comment.trim() ? comment : undefined,
                offerId,
                authorId: user.id
            });
            setComment('');
            setRating(5);
            fetchReviews(); // Refresh list
        } catch (error) {
            console.error('Failed to submit review', error);
            alert('Ошибка при отправке отзыва. Попробуйте позже.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse flex space-x-4 p-6"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-white/10 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-white/10 rounded"></div><div className="h-4 bg-white/10 rounded w-5/6"></div></div></div></div>;
    }

    return (
        <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-purple-400" />
                    Отзывы покупателей
                </h2>
                {stats.totalReviews > 0 && (
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                        <span className="text-xl font-bold text-yellow-500">{stats.averageRating.toFixed(1)}</span>
                        <div className="flex text-yellow-500 text-sm">
                            {'★'.repeat(Math.round(stats.averageRating))}{'☆'.repeat(5 - Math.round(stats.averageRating))}
                        </div>
                        <span className="text-white/40 text-sm">({stats.totalReviews})</span>
                    </div>
                )}
            </div>

            {/* Submit Review Form */}
            {isAuthenticated ? (
                <form onSubmit={handleSubmit} className="mb-10 bg-white/5 p-6 rounded-2xl border border-white/10">
                    <h3 className="font-semibold mb-4 text-white/80">Оставить отзыв</h3>

                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm text-white/50 mr-2">Оценка:</span>
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="bg-transparent border-0 cursor-pointer p-0 transition-transform hover:scale-110"
                                title={`Оценить на ${star} звезд`}
                                aria-label={`Оценить на ${star} звезд`}
                            >
                                <Star
                                    className={`w-6 h-6 ${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-white/20'}`}
                                />
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Расскажите о своих впечатлениях (необязательно)"
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/30 outline-none min-h-[100px] resize-y focus:border-purple-500/50 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="absolute bottom-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-2 flex items-center justify-center cursor-pointer border-0 hover:opacity-90 transition-opacity disabled:opacity-50"
                            title="Отправить отзыв"
                            aria-label="Отправить отзыв"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            ) : (
                <div className="mb-10 bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                    <p className="text-white/60 mb-0">Войдите в аккаунт, чтобы оставить отзыв.</p>
                </div>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.length === 0 ? (
                    <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                        <Star className="w-8 h-8 text-white/20 mx-auto mb-3" />
                        <p className="text-white/40">Пока нет отзывов. Станьте первым!</p>
                    </div>
                ) : (
                    reviews.map(review => (
                        <div key={review.id} className="bg-white/5 p-5 rounded-2xl border border-white/5">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 border border-white/10 shrink-0 relative">
                                        {review.author.avatarUrl ? (
                                            <Image src={review.author.avatarUrl} alt={review.author.displayName || 'User'} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/50 font-bold">
                                                {(review.author.displayName || 'U')[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-white/90">
                                                {review.author.displayName || 'Аноним'}
                                            </span>
                                            {review.author.tier === 'PLATINUM' && <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 flex items-center gap-1 w-max"><Gem className="w-3 h-3" /> PRO</span>}
                                            {review.author.tier === 'GOLD' && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/30 flex items-center gap-1 w-max"><Medal className="w-3 h-3" /> Gold</span>}
                                        </div>
                                        <div className="text-xs text-white/30">
                                            {new Date(review.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-0.5 text-yellow-500">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-500' : 'text-white/20'}`} />
                                    ))}
                                </div>
                            </div>
                            {review.comment && (
                                <p className="text-white/70 text-sm leading-relaxed mt-2 pl-12 border-l-2 border-white/10 py-1 ml-1 whitespace-pre-wrap">
                                    {review.comment}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
