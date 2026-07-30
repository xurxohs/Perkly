'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Archive,
    Bookmark,
    CalendarClock,
    Check,
    FlipHorizontal,
    ImagePlus,
    Layers,
    Loader2,
    RotateCw,
    Save,
    UploadCloud,
} from 'lucide-react';
import api, { TopkaPost, TopkaPostInput } from '@/lib/api';

type TabKey = 'content' | 'photo' | 'publish' | 'preview';
type CropVariant = 'poster3x4' | 'story9x16' | 'square1x1' | 'preview16x9';

const POST_TYPES: TopkaPost['postType'][] = ['event', 'poster', 'promo', 'collection', 'news', 'place'];
const CROP_PRESETS: Record<CropVariant, { label: string; width: number; height: number }> = {
    poster3x4: { label: 'Poster 3:4', width: 1080, height: 1440 },
    story9x16: { label: 'Story 9:16', width: 1080, height: 1920 },
    square1x1: { label: 'Square 1:1', width: 1080, height: 1080 },
    preview16x9: { label: 'Preview 16:9', width: 1280, height: 720 },
};

const emptyPost: TopkaPostInput = {
    postType: 'event',
    status: 'draft',
    title: '',
    subtitle: '',
    description: '',
    fullDescription: '',
    category: 'Концерт',
    tags: [],
    badges: ['Сегодня'],
    date: null,
    startTime: '',
    endTime: '',
    location: '',
    address: '',
    latitude: null,
    longitude: null,
    priceText: '',
    ctaText: '',
    ctaUrl: '',
    priority: 0,
    isFeatured: false,
    publishAt: null,
    expiresAt: null,
    media: {},
    dominantColor: '#f97316',
    fallbackGradient: 'linear-gradient(135deg, #f97316, #7c3aed)',
};

export default function TopkaPostEditor() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bootedRef = useRef(false);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [postId, setPostId] = useState<string | null>(null);
    const [form, setForm] = useState<TopkaPostInput>(emptyPost);
    const [activeTab, setActiveTab] = useState<TabKey>('content');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [sourceDataUrl, setSourceDataUrl] = useState<string>('');
    const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
    const [cropVariant, setCropVariant] = useState<CropVariant>('poster3x4');
    const [zoom, setZoom] = useState(1);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [flip, setFlip] = useState(false);
    const [quality, setQuality] = useState(0.86);

    useEffect(() => {
        if (bootedRef.current) return;
        bootedRef.current = true;

        const id = searchParams.get('id');
        const load = async () => {
            try {
                if (id) {
                    const post = await api.admin.getTopkaPost(id);
                    setPostId(post.id);
                    setForm(fromPost(post));
                } else {
                    const post = await api.admin.createTopkaPost(emptyPost);
                    setPostId(post.id);
                    setForm(fromPost(post));
                    router.replace(`/admin/topka/posts/new?id=${post.id}`);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Не удалось открыть пост');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router, searchParams]);

    useEffect(() => {
        if (!postId || loading || form.status !== 'draft') return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            savePost({}, true);
        }, 1400);
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, postId, loading]);

    const validationErrors = useMemo(() => {
        const missing: string[] = [];
        if (!form.title?.trim()) missing.push('заголовок');
        if (!form.description?.trim()) missing.push('описание');
        if (!form.category?.trim()) missing.push('категория');
        if (!form.date) missing.push('дата');
        if (!form.media?.poster3x4Url && !form.media?.originalUrl) missing.push('poster 3:4');
        return missing;
    }, [form]);

    const updateForm = (patch: TopkaPostInput) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const updateMedia = (patch: NonNullable<TopkaPostInput['media']>) => {
        setForm((prev) => ({ ...prev, media: { ...(prev.media || {}), ...patch } }));
    };

    const savePost = async (patch: TopkaPostInput = {}, silent = false) => {
        if (!postId) return null;
        setSaving(true);
        setError('');
        try {
            const payload = { ...form, ...patch };
            const post = await api.admin.updateTopkaPost(postId, payload);
            setForm(fromPost(post));
            setLastSaved(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
            return post;
        } catch (err) {
            if (!silent) setError(err instanceof Error ? err.message : 'Не удалось сохранить');
            return null;
        } finally {
            setSaving(false);
        }
    };

    const publish = async (status: TopkaPost['status']) => {
        if ((status === 'published' || status === 'scheduled') && validationErrors.length > 0) {
            setError(`Не хватает: ${validationErrors.join(', ')}`);
            return;
        }
        const post = await savePost({ status }, false);
        if (post) router.push('/admin/topka/posts');
    };

    const handleFile = async (file: File) => {
        const dataUrl = await readFileAsDataUrl(file);
        setSourceDataUrl(dataUrl);
        const size = await readImageSize(dataUrl);
        setSourceSize(size);

        const uploaded = await api.admin.uploadTopkaMedia({
            fileName: file.name,
            dataUrl,
            variant: 'original',
        });
        updateMedia({ originalUrl: uploaded.url });
        await savePost({ media: { ...(form.media || {}), originalUrl: uploaded.url } }, true);
    };

    const exportCrop = async () => {
        if (!sourceDataUrl) {
            setError('Сначала загрузите original, чтобы сделать crop');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const preset = CROP_PRESETS[cropVariant];
            const dataUrl = await renderCrop(sourceDataUrl, preset.width, preset.height, {
                zoom,
                offsetX,
                offsetY,
                rotation,
                flip,
                quality,
            });
            const uploaded = await api.admin.cropTopkaMedia({
                fileName: `${cropVariant}.jpg`,
                dataUrl,
                variant: cropVariant,
            });
            const key = `${cropVariant}Url` as keyof NonNullable<TopkaPostInput['media']>;
            const nextMedia = { ...(form.media || {}), [key]: uploaded.url };
            updateMedia({ [key]: uploaded.url });
            await savePost({ media: nextMedia }, true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось экспортировать crop');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in fade-in-up">
            <div className="flex flex-col xl:flex-row justify-between gap-4">
                <div>
                    <div className="text-sm text-white/40 mb-2">
                        <Link href="/admin/topka/posts" className="text-white/50 hover:text-white no-underline">Topka posts</Link> / редактор
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">{form.title || 'Новый пост'}</h1>
                    <p className="text-white/40">Draft автосохраняется{lastSaved ? ` · сохранено ${lastSaved}` : ''}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => savePost()} className="adminButton bg-white/5 text-white/80 hover:bg-white/10">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Сохранить
                    </button>
                    <button onClick={() => publish('scheduled')} className="adminButton bg-blue-500/10 text-blue-200 hover:bg-blue-500/20">
                        <CalendarClock className="w-4 h-4" /> Schedule
                    </button>
                    <button onClick={() => publish('published')} className="adminButton bg-green-500/10 text-green-200 hover:bg-green-500/20">
                        <Check className="w-4 h-4" /> Publish
                    </button>
                    <button onClick={() => publish('archived')} className="adminButton bg-red-500/10 text-red-200 hover:bg-red-500/20">
                        <Archive className="w-4 h-4" /> Archive
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {([
                    ['content', 'Контент'],
                    ['photo', 'Фото'],
                    ['publish', 'Публикация'],
                    ['preview', 'Превью'],
                ] as [TabKey, string][]).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`px-4 h-10 rounded-xl border text-sm font-bold transition-all ${activeTab === key ? 'bg-orange-500/15 border-orange-500/30 text-orange-200' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
                <div className="rounded-3xl border border-white/5 bg-[#101524]/70 p-5 md:p-6">
                    {activeTab === 'content' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Заголовок" value={form.title || ''} onChange={(value) => updateForm({ title: value })} required />
                            <Field label="Подзаголовок" value={form.subtitle || ''} onChange={(value) => updateForm({ subtitle: value })} />
                            <SelectField label="Тип" value={form.postType || 'event'} options={POST_TYPES} onChange={(value) => updateForm({ postType: value as TopkaPost['postType'] })} />
                            <Field label="Категория" value={form.category || ''} onChange={(value) => updateForm({ category: value })} required />
                            <TextArea label="Описание" value={form.description || ''} onChange={(value) => updateForm({ description: value })} required />
                            <TextArea label="Полное описание" value={form.fullDescription || ''} onChange={(value) => updateForm({ fullDescription: value })} />
                            <TokenField label="Бейджи" value={form.badges || []} onChange={(value) => updateForm({ badges: value })} placeholder="Сегодня, Бесплатно, Hot" />
                            <TokenField label="Теги" value={form.tags || []} onChange={(value) => updateForm({ tags: value })} placeholder="музыка, weekend" />
                            <Field label="Место" value={form.location || ''} onChange={(value) => updateForm({ location: value })} />
                            <Field label="Адрес" value={form.address || ''} onChange={(value) => updateForm({ address: value })} />
                            <Field label="Цена" value={form.priceText || ''} onChange={(value) => updateForm({ priceText: value })} placeholder="Бесплатно / от 150 000 сум" />
                            <Field label="CTA" value={form.ctaText || ''} onChange={(value) => updateForm({ ctaText: value })} placeholder="Купить билет" />
                            <Field label="CTA URL" value={form.ctaUrl || ''} onChange={(value) => updateForm({ ctaUrl: value })} />
                        </div>
                    )}

                    {activeTab === 'photo' && (
                        <div className="space-y-5">
                            <div
                                onDrop={(event) => {
                                    event.preventDefault();
                                    const file = event.dataTransfer.files[0];
                                    if (file) handleFile(file);
                                }}
                                onDragOver={(event) => event.preventDefault()}
                                className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center"
                            >
                                <UploadCloud className="w-9 h-9 text-orange-300 mx-auto mb-3" />
                                <div className="text-white font-bold mb-1">Перетащите изображение</div>
                                <div className="text-sm text-white/40 mb-4">Original сохраняется отдельно, cropped variants экспортируются прямоугольными файлами</div>
                                <label className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-orange-500/15 text-orange-200 cursor-pointer font-bold">
                                    <ImagePlus className="w-4 h-4" /> Выбрать файл
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (file) handleFile(file);
                                        }}
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5">
                                <div className="rounded-3xl bg-black/30 border border-white/10 p-4">
                                    <div className="relative mx-auto max-w-[360px] aspect-[3/4] overflow-hidden rounded-[42px] bg-white/5">
                                        {(sourceDataUrl || form.media?.poster3x4Url || form.media?.originalUrl) ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={sourceDataUrl || form.media?.poster3x4Url || form.media?.originalUrl || ''}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                style={{
                                                    transform: `translate(${offsetX / 9}px, ${offsetY / 9}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${flip ? -1 : 1})`,
                                                }}
                                            />
                                        ) : (
                                            <PosterFallback form={form} />
                                        )}
                                        <div className="absolute left-0 right-0 top-0 h-[18%] border-b border-dashed border-cyan-300/60 bg-cyan-300/5" />
                                        <div className="absolute left-0 right-0 bottom-0 h-[28%] border-t border-dashed border-orange-300/60 bg-orange-300/5" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <SelectField label="Aspect preset" value={cropVariant} options={Object.keys(CROP_PRESETS)} onChange={(value) => setCropVariant(value as CropVariant)} />
                                    <RangeField label="Zoom" value={zoom} min={0.7} max={2.4} step={0.01} onChange={setZoom} />
                                    <RangeField label="Pan X" value={offsetX} min={-400} max={400} step={1} onChange={setOffsetX} />
                                    <RangeField label="Pan Y" value={offsetY} min={-400} max={400} step={1} onChange={setOffsetY} />
                                    <RangeField label="Quality" value={quality} min={0.55} max={0.95} step={0.01} onChange={setQuality} />
                                    <div className="flex gap-2">
                                        <button className="iconButton" onClick={() => setRotation((value) => (value + 90) % 360)} title="Повернуть">
                                            <RotateCw className="w-4 h-4" />
                                        </button>
                                        <button className="iconButton" onClick={() => setFlip((value) => !value)} title="Flip horizontal">
                                            <FlipHorizontal className="w-4 h-4" />
                                        </button>
                                        <button className="adminButton bg-white/5 text-white/70" onClick={() => { setZoom(1); setOffsetX(0); setOffsetY(0); }} title="Auto fit">
                                            Auto fit
                                        </button>
                                    </div>
                                    {sourceSize && sourceTooSmall(sourceSize, CROP_PRESETS[cropVariant]) && (
                                        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-100">
                                            Source {sourceSize.width}x{sourceSize.height} меньше экспорта {CROP_PRESETS[cropVariant].width}x{CROP_PRESETS[cropVariant].height}
                                        </div>
                                    )}
                                    <button onClick={exportCrop} className="w-full adminButton bg-orange-500/15 text-orange-200 hover:bg-orange-500/25 justify-center">
                                        <Layers className="w-4 h-4" /> Export {CROP_PRESETS[cropVariant].label}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'publish' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Дата события" type="date" value={dateInput(form.date)} onChange={(value) => updateForm({ date: value ? new Date(`${value}T00:00:00`).toISOString() : null })} required />
                            <Field label="Start time" value={form.startTime || ''} onChange={(value) => updateForm({ startTime: value })} placeholder="19:00" />
                            <Field label="End time" value={form.endTime || ''} onChange={(value) => updateForm({ endTime: value })} placeholder="22:00" />
                            <Field label="Publish at" type="datetime-local" value={dateTimeInput(form.publishAt)} onChange={(value) => updateForm({ publishAt: value ? new Date(value).toISOString() : null })} />
                            <Field label="Expires at" type="datetime-local" value={dateTimeInput(form.expiresAt)} onChange={(value) => updateForm({ expiresAt: value ? new Date(value).toISOString() : null })} />
                            <Field label="Priority" type="number" value={String(form.priority || 0)} onChange={(value) => updateForm({ priority: Number(value) })} />
                            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white">
                                <input type="checkbox" checked={Boolean(form.isFeatured)} onChange={(event) => updateForm({ isFeatured: event.target.checked })} />
                                Hero / featured карточка
                            </label>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                                {validationErrors.length > 0 ? `Для публикации не хватает: ${validationErrors.join(', ')}` : 'Пост готов к публикации.'}
                            </div>
                        </div>
                    )}

                    {activeTab === 'preview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <VariantPreview label="Poster 3:4" url={form.media?.poster3x4Url} ratio="aspect-[3/4]" />
                            <VariantPreview label="Story 9:16" url={form.media?.story9x16Url} ratio="aspect-[9/16]" />
                            <VariantPreview label="Square 1:1" url={form.media?.square1x1Url} ratio="aspect-square" />
                            <VariantPreview label="Preview 16:9" url={form.media?.preview16x9Url} ratio="aspect-video" />
                        </div>
                    )}
                </div>

                <div className="sticky top-24 rounded-3xl border border-white/5 bg-[#101524]/70 p-5">
                    <div className="text-sm font-bold text-white/60 mb-4">Live iOS preview</div>
                    <div className="mx-auto max-w-[340px] aspect-[3/4] rounded-[48px] overflow-hidden bg-black relative shadow-2xl">
                        {form.media?.poster3x4Url || form.media?.originalUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={form.media.poster3x4Url || form.media.originalUrl || ''} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                            <PosterFallback form={form} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/90" />
                        <div className="absolute left-5 top-5 right-5 flex flex-wrap gap-2">
                            {(form.badges || []).slice(0, 3).map((badge) => (
                                <span key={badge} className="px-3 h-7 inline-flex items-center rounded-full bg-orange-500/85 text-white text-[11px] font-black">{badge}</span>
                            ))}
                            {form.priceText && <span className="px-3 h-7 inline-flex items-center rounded-full bg-green-500/85 text-white text-[11px] font-black">{form.priceText}</span>}
                        </div>
                        <button className="absolute right-5 top-5 w-10 h-10 rounded-full bg-black/35 border border-white/15 flex items-center justify-center text-white">
                            <Bookmark className="w-5 h-5" />
                        </button>
                        <div className="absolute left-6 right-6 bottom-6">
                            <div className="text-white text-3xl font-black leading-tight">{form.title || 'Название поста'}</div>
                            <div className="text-white/70 text-sm mt-2 line-clamp-2">{form.description || 'Короткое описание события или постера'}</div>
                            <div className="flex flex-wrap gap-2 mt-4 text-[11px] font-bold text-white/75">
                                <span className="px-2.5 h-7 rounded-full bg-white/12 inline-flex items-center">{form.startTime || '19:00'}</span>
                                <span className="px-2.5 h-7 rounded-full bg-white/12 inline-flex items-center">{form.location || 'Tashkent'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .adminButton {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    min-height: 2.5rem;
                    padding: 0 1rem;
                    border-radius: 0.75rem;
                    border: 0;
                    font-size: 0.875rem;
                    font-weight: 800;
                    cursor: pointer;
                    transition: background 160ms ease, color 160ms ease;
                }
                .iconButton {
                    width: 2.5rem;
                    height: 2.5rem;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 0.75rem;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.05);
                    color: rgba(255,255,255,0.75);
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
}

function Field(props: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
    return (
        <label className="block">
            <span className="block text-xs font-bold text-white/45 mb-1.5">{props.label}{props.required ? ' *' : ''}</span>
            <input
                type={props.type || 'text'}
                value={props.value}
                placeholder={props.placeholder}
                onChange={(event) => props.onChange(event.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder-white/25 outline-none focus:border-orange-500/50"
            />
        </label>
    );
}

function TextArea(props: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
    return (
        <label className="block md:col-span-2">
            <span className="block text-xs font-bold text-white/45 mb-1.5">{props.label}{props.required ? ' *' : ''}</span>
            <textarea
                value={props.value}
                onChange={(event) => props.onChange(event.target.value)}
                rows={4}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-orange-500/50 resize-y"
            />
        </label>
    );
}

function SelectField(props: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
    return (
        <label className="block">
            <span className="block text-xs font-bold text-white/45 mb-1.5">{props.label}</span>
            <select
                value={props.value}
                onChange={(event) => props.onChange(event.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-orange-500/50"
            >
                {props.options.map((option) => (
                    <option key={option} value={option} className="bg-[#101524]">{option}</option>
                ))}
            </select>
        </label>
    );
}

function TokenField(props: { label: string; value: string[]; onChange: (value: string[]) => void; placeholder?: string }) {
    return (
        <label className="block">
            <span className="block text-xs font-bold text-white/45 mb-1.5">{props.label}</span>
            <input
                value={props.value.join(', ')}
                placeholder={props.placeholder}
                onChange={(event) => props.onChange(event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder-white/25 outline-none focus:border-orange-500/50"
            />
        </label>
    );
}

function RangeField(props: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
    return (
        <label className="block">
            <span className="flex justify-between text-xs font-bold text-white/45 mb-1.5">
                <span>{props.label}</span>
                <span>{props.value}</span>
            </span>
            <input
                type="range"
                min={props.min}
                max={props.max}
                step={props.step}
                value={props.value}
                onChange={(event) => props.onChange(Number(event.target.value))}
                className="w-full accent-orange-500"
            />
        </label>
    );
}

function PosterFallback({ form }: { form: TopkaPostInput }) {
    return (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(249,115,22,0.55),transparent_32%),linear-gradient(135deg,#171923,#0b0d12)] flex items-center justify-center p-8 text-center">
            <div>
                <div className="text-orange-200/70 text-xs font-black uppercase tracking-widest mb-3">{form.category || 'Topka'}</div>
                <div className="text-white/80 text-2xl font-black leading-tight">{form.title || 'Fallback poster'}</div>
            </div>
        </div>
    );
}

function VariantPreview({ label, url, ratio }: { label: string; url?: string | null; ratio: string }) {
    return (
        <div>
            <div className="text-xs font-bold text-white/45 mb-2">{label}</div>
            <div className={`${ratio} rounded-3xl overflow-hidden bg-white/5 border border-white/10`}>
                {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">Нет экспорта</div>
                )}
            </div>
        </div>
    );
}

function fromPost(post: TopkaPost): TopkaPostInput {
    return {
        ...post,
        media: post.media || {},
    };
}

function dateInput(value?: string | null) {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
}

function dateTimeInput(value?: string | null) {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 16);
}

function sourceTooSmall(source: { width: number; height: number }, target: { width: number; height: number }) {
    return source.width < target.width || source.height < target.height;
}

function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function readImageSize(src: string) {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error('Не удалось прочитать изображение'));
        image.src = src;
    });
}

async function renderCrop(
    src: string,
    width: number,
    height: number,
    options: { zoom: number; offsetX: number; offsetY: number; rotation: number; flip: boolean; quality: number },
) {
    const image = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');

    context.fillStyle = '#0b0d12';
    context.fillRect(0, 0, width, height);
    const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * options.zoom;
    context.translate(width / 2 + options.offsetX, height / 2 + options.offsetY);
    context.rotate((options.rotation * Math.PI) / 180);
    context.scale(options.flip ? -1 : 1, 1);
    context.drawImage(
        image,
        (-image.naturalWidth * baseScale) / 2,
        (-image.naturalHeight * baseScale) / 2,
        image.naturalWidth * baseScale,
        image.naturalHeight * baseScale,
    );

    return canvas.toDataURL('image/jpeg', options.quality);
}

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Не удалось загрузить изображение для crop'));
        image.src = src;
    });
}
