"use client";

import Link from "next/link";
import {
  Calculator,
  ArrowRight,
  Shield,
  Zap,
  Users,
  TrendingUp,
  BadgeCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { companiesApi, Company, CompanyStatus } from "@/lib/api";

const STATUS_META: Record<
  CompanyStatus,
  { title: string; text: string; className: string }
> = {
  PENDING_MODERATION: {
    title: "Заявка на модерации",
    text: "Мы проверяем компанию. После подтверждения откроется кабинет продавца.",
    className: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  },
  ACTIVE: {
    title: "Компания активна",
    text: "Можно создавать офферы и управлять продажами в кабинете продавца.",
    className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  },
  SUSPENDED: {
    title: "Компания приостановлена",
    text: "Обновите данные и отправьте заявку на повторную проверку.",
    className: "text-red-300 bg-red-500/10 border-red-500/25",
  },
};

export default function SellPage() {
  const { user, isAuthenticated, loading, refreshUser } = useAuth();
  const [price, setPrice] = useState(100_000);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    legalName: "",
    brandName: "",
    inn: "",
    phone: "",
  });
  const applicationRef = useRef<HTMLDivElement>(null);
  const commission = 0.05;
  const income = price - price * commission;
  const canUseVendorHub = user?.role === "VENDOR" || user?.role === "ADMIN";

  const benefits = [
    {
      icon: Users,
      title: "Растущая аудитория",
      desc: "Публикуйте предложения для пользователей Perkly в Узбекистане",
    },
    {
      icon: Shield,
      title: "Проверяемые статусы",
      desc: "История заказа помогает покупателю, продавцу и поддержке",
    },
    {
      icon: Zap,
      title: "Автовыдача для кодов",
      desc: "Для совместимых промокодов результат доступен после оплаты",
    },
    {
      icon: TrendingUp,
      title: "Аналитика продаж",
      desc: "Отслеживайте просмотры, конверсии и доход",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Регистрация",
      desc: "Заполните профиль продавца и данные компании",
    },
    {
      num: "02",
      title: "Создайте оффер",
      desc: "Добавьте купон, подписку или цифровой товар",
    },
    {
      num: "03",
      title: "Получайте оплату",
      desc: "Покупатель платит — вы получаете 95% на баланс",
    },
  ];

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      setCompany(null);
      return;
    }

    let isMounted = true;
    setCompanyLoading(true);
    companiesApi
      .getMine()
      .then((data) => {
        if (!isMounted) return;
        setCompany(data);
        if (data) {
          setForm({
            legalName: data.legalName,
            brandName: data.brandName,
            inn: data.inn,
            phone: data.phone ?? "",
          });
        }
      })
      .catch(() => {
        if (isMounted) setCompany(null);
      })
      .finally(() => {
        if (isMounted) setCompanyLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, loading]);

  const scrollToApplication = () => {
    applicationRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!/^\d{9}$/.test(form.inn.trim())) {
      setError("ИНН должен состоять ровно из 9 цифр.");
      return;
    }

    setSubmitting(true);
    try {
      const updatedCompany = await companiesApi.apply({
        legalName: form.legalName,
        brandName: form.brandName,
        inn: form.inn,
        phone: form.phone || undefined,
      });
      setCompany(updatedCompany);
      setSuccess("Заявка отправлена на модерацию.");
      await refreshUser();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось отправить заявку.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusMeta = company ? STATUS_META[company.status] : null;
  const showApplicationForm =
    isAuthenticated && (!company || company.status !== "ACTIVE");

  return (
    <div className="flex flex-col items-center px-6 pb-24 max-w-[1200px] mx-auto w-full">
      {/* Hero */}
      <section className="pt-20 pb-16 text-center w-full relative">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)",
          }}
        />

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-5 leading-[1.05]">
          Продавайте на
          <br />
          <span className="text-gradient-green">Perkly Маркетплейсе</span>
        </h1>

        <p className="text-lg text-white/40 max-w-lg mx-auto mb-10 leading-relaxed">
          Рестораны, сервисы и бренды могут размещать купоны, подписки и цифровые
          товары для покупателей в Узбекистане.
        </p>

        {isAuthenticated && company?.status === "ACTIVE" && canUseVendorHub ? (
          <Link
            href="/vendor"
            className="mx-auto px-8 py-4 rounded-xl text-black font-bold flex items-center gap-2 relative z-10 no-underline w-fit"
            style={{
              background: "linear-gradient(135deg, #4ade80, #22d3ee)",
              boxShadow: "0 0 30px rgba(34,197,94,0.25)",
            }}
          >
            Открыть кабинет <ArrowRight className="w-5 h-5" />
          </Link>
        ) : isAuthenticated ? (
          <button
            onClick={scrollToApplication}
            className="mx-auto px-8 py-4 rounded-xl text-black font-bold cursor-pointer border-0 flex items-center gap-2 relative z-10"
            style={{
              background: "linear-gradient(135deg, #4ade80, #22d3ee)",
              boxShadow: "0 0 30px rgba(34,197,94,0.25)",
            }}
          >
            Подать заявку <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <Link
            href="/login"
            className="mx-auto px-8 py-4 rounded-xl text-black font-bold flex items-center gap-2 relative z-10 no-underline w-fit"
            style={{
              background: "linear-gradient(135deg, #4ade80, #22d3ee)",
              boxShadow: "0 0 30px rgba(34,197,94,0.25)",
            }}
          >
            Войти и подать заявку <ArrowRight className="w-5 h-5" />
          </Link>
        )}
      </section>

      {/* Calculator */}
      <section className="w-full mb-20">
        <div
          className="glass-card p-8 md:p-10 flex flex-col md:flex-row items-center gap-10"
          style={{
            background:
              "linear-gradient(135deg, rgba(4,120,87,0.1), rgba(6,78,59,0.06))",
            borderColor: "rgba(34,197,94,0.12)",
          }}
        >
          <div className="flex-1 relative z-10">
            <div
              className="inline-flex items-center gap-2 text-green-300 font-semibold text-sm mb-4 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.15)",
              }}
            >
              <Calculator className="w-4 h-4" /> Калькулятор дохода
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              Сколько вы заработаете?
            </h2>
            <p className="text-white/35 text-sm mb-6">
              Комиссия платформы — всего 5%. Вы получаете 95% от каждой продажи.
            </p>

            <div className="mb-6">
              <label className="text-sm text-white/50 mb-2 block">
                Цена вашего товара (UZS)
              </label>
              <input
                type="range"
                min={1_000}
                max={100_000_000}
                step={1_000}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full accent-green-500 mb-2"
              />
              <div className="flex justify-between text-xs text-white/30">
                <span>1 000 сум</span>
                <span className="text-lg font-bold text-white">
                  {Number(price || 0).toLocaleString("ru-RU")} сум
                </span>
                <span>100 000 000 сум</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0 relative z-10">
            <div className="text-center">
              <div className="text-sm text-white/40 mb-1">Цена товара</div>
              <div className="text-3xl font-extrabold text-white">
                {Number(price || 0).toLocaleString("ru-RU")} сум
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-white/20" />
            <div className="text-center">
              <div className="text-sm text-white/40 mb-1">Ваш доход</div>
              <div className="text-3xl font-extrabold text-gradient-green">
                {Math.round(income).toLocaleString("ru-RU")} сум
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-3">
          <span className="text-xs text-white/25">
            Комиссия платформы: 5% • Без скрытых платежей
          </span>
        </div>
      </section>

      {/* Benefits */}
      <section className="w-full mb-20">
        <h2 className="text-2xl font-bold text-white mb-7">
          Почему продавцы выбирают Perkly
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benefits.map((b, i) => (
            <div key={i} className="glass-card p-6 flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-10"
                style={{ background: "rgba(34,197,94,0.1)" }}
              >
                <b.icon className="w-5 h-5 text-green-400" />
              </div>
              <div className="relative z-10">
                <h3 className="text-base font-bold text-white mb-1">
                  {b.title}
                </h3>
                <p className="text-sm text-white/35">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="w-full mb-20">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          Как начать продавать
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <div key={i} className="glass-card p-7 text-center">
              <div className="text-4xl font-black text-white/5 mb-3 relative z-10">
                {s.num}
              </div>
              <h3 className="text-lg font-bold text-white mb-2 relative z-10">
                {s.title}
              </h3>
              <p className="text-sm text-white/35 relative z-10">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        ref={applicationRef}
        className="w-full glass-card p-8 md:p-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(4,120,87,0.12), rgba(6,78,59,0.06))",
          borderColor: "rgba(34,197,94,0.1)",
        }}
      >
        <div
          className="absolute -right-20 -top-20 w-60 h-60 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(34,197,94,0.1), transparent)",
          }}
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 items-start">
          <div>
            <BadgeCheck className="w-10 h-10 text-green-400 mb-4" />
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              Заявка партнера
            </h2>
            <p className="text-white/40 mb-6 max-w-md">
              Укажите юридическое название, бренд и ИНН. После модерации откроем
              кабинет продавца.
            </p>

            {companyLoading ? (
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Проверяем статус заявки...
              </div>
            ) : (
              company &&
              statusMeta && (
                <div
                  className={`rounded-2xl p-4 border ${statusMeta.className}`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {company.status === "ACTIVE" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {statusMeta.title}
                  </div>
                  <p className="text-sm opacity-80">{statusMeta.text}</p>
                  <div className="text-xs opacity-70 mt-3">
                    {company.brandName} · ИНН {company.inn}
                  </div>
                </div>
              )
            )}

            {company?.status === "ACTIVE" && canUseVendorHub && (
              <Link
                href="/vendor"
                className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-black font-bold no-underline"
                style={{
                  background: "linear-gradient(135deg, #4ade80, #22d3ee)",
                }}
              >
                Открыть кабинет <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {!isAuthenticated && !loading && (
            <div className="rounded-2xl p-6 bg-black/20 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-2">
                Войдите, чтобы подать заявку
              </h3>
              <p className="text-sm text-white/40 mb-5">
                Заявка компании привязывается к вашему аккаунту Perkly.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/login"
                  className="px-5 py-3 rounded-xl bg-white text-black font-bold no-underline text-center"
                >
                  Войти
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold no-underline text-center"
                >
                  Создать аккаунт
                </Link>
              </div>
            </div>
          )}

          {showApplicationForm && (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-6 bg-black/20 border border-white/10 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-white/50 mb-2 block">
                    Юридическое название
                  </span>
                  <input
                    value={form.legalName}
                    onChange={(event) =>
                      setForm({ ...form, legalName: event.target.value })
                    }
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-emerald-400/60"
                    placeholder="OOO Perkly"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-white/50 mb-2 block">
                    Бренд
                  </span>
                  <input
                    value={form.brandName}
                    onChange={(event) =>
                      setForm({ ...form, brandName: event.target.value })
                    }
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-emerald-400/60"
                    placeholder="Perkly"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-white/50 mb-2 block">ИНН</span>
                  <input
                    value={form.inn}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        inn: event.target.value.replace(/\D/g, "").slice(0, 9),
                      })
                    }
                    required
                    inputMode="numeric"
                    minLength={9}
                    maxLength={9}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-emerald-400/60"
                    placeholder="123456789"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-white/50 mb-2 block">
                    Телефон
                  </span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-emerald-400/60"
                    placeholder="+998901234567"
                  />
                </label>
              </div>

              {error && (
                <div className="rounded-xl p-3 text-sm text-red-300 bg-red-500/10 border border-red-500/20">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl p-3 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || companyLoading}
                className="w-full px-6 py-4 rounded-xl text-black font-bold border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #4ade80, #22d3ee)",
                }}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {company ? "Обновить заявку" : "Отправить заявку"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
