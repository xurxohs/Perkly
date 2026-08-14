"use client";

// Регистрация: один вопрос на экран, без декоративных слоёв.
// Шаги: способ входа → (email-форма) → о себе → готово.

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Car,
  CheckCircle2,
  ChevronLeft,
  Film,
  Gamepad2,
  GraduationCap,
  Loader2,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Ticket,
  TriangleAlert,
  Utensils,
  Zap,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useTelegram } from "@/hooks/useTelegram";

const API_BASE =
  typeof window !== "undefined"
    ? "/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

type Step = "start" | "email" | "about" | "done";
type Flow = "telegram" | "email" | null;

const INTERESTS = [
  { id: "food", label: "Еда", icon: Utensils },
  { id: "taxi", label: "Такси", icon: Car },
  { id: "cinema", label: "Кино", icon: Film },
  { id: "subscriptions", label: "Подписки", icon: BadgeCheck },
  { id: "games", label: "Игры", icon: Gamepad2 },
  { id: "market", label: "Маркетплейсы", icon: ShoppingBag },
  { id: "events", label: "События", icon: Ticket },
  { id: "learning", label: "Обучение", icon: GraduationCap },
];

const MIN_BIRTH_YEAR = 1940;
const MIN_AGE = 12;
const MIN_PASSWORD_LENGTH = 8;

function maxBirthYear() {
  return new Date().getFullYear() - MIN_AGE;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, refreshUser, user } = useAuth();
  const { initData, isTMA, hapticNotification } = useTelegram();

  const [step, setStep] = useState<Step>("start");
  const [flow, setFlow] = useState<Flow>(null);
  const [form, setForm] = useState({ displayName: "", email: "", password: "" });
  const [birthYear, setBirthYear] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [tgWaiting, setTgWaiting] = useState(false);
  const [tgUrl, setTgUrl] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Внутри Telegram Mini App вход происходит без единого нажатия.
  useEffect(() => {
    if (!initData || !isTMA || user) return;
    setLoading(true);
    fetch(`${API_BASE}/auth/telegram-miniapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ initData }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) return;
        hapticNotification("success");
        return refreshUser().then(() => {
          setFlow("telegram");
          setStep("about");
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initData, isTMA, user, refreshUser, hapticNotification]);

  const steps: Step[] = flow === "telegram" ? ["start", "about"] : ["start", "email", "about"];
  const stepIndex = steps.indexOf(step);

  const birthYearNumber = Number(birthYear);
  const isBirthYearValid =
    /^\d{4}$/.test(birthYear) &&
    birthYearNumber >= MIN_BIRTH_YEAR &&
    birthYearNumber <= maxBirthYear();
  const isPasswordValid = form.password.length >= MIN_PASSWORD_LENGTH;

  const goTo = (next: Step) => {
    setError("");
    setStep(next);
  };

  const stopTelegramPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const cancelTelegram = () => {
    stopTelegramPolling();
    setTgWaiting(false);
    setTgUrl("");
    setFlow(null);
  };

  const handleTelegram = async () => {
    // Вкладку открываем до fetch, иначе Safari считает её всплывающим окном.
    const telegramWindow = window.open("about:blank", "_blank");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/telegram-init`, { credentials: "include" });
      if (!res.ok) throw new Error("Telegram init failed");
      const data = await res.json();
      if (!data.token || !data.url) throw new Error("Invalid Telegram login response");

      setTgUrl(data.url);
      setTgWaiting(true);
      setFlow("telegram");
      if (telegramWindow) telegramWindow.location.href = data.url;

      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(
            `${API_BASE}/auth/telegram-poll?token=${data.token}`,
            { credentials: "include" },
          );
          const pollData = await pollRes.json();
          if (pollData.status === "ok") {
            stopTelegramPolling();
            await refreshUser();
            hapticNotification("success");
            setTgWaiting(false);
            goTo("about");
          } else if (pollData.status === "expired") {
            cancelTelegram();
            setError("Время ожидания вышло. Попробуйте ещё раз.");
          } else if (pollData.status === "error") {
            cancelTelegram();
            setError(pollData.message || "Не удалось войти через Telegram.");
          }
        } catch {
          // Сеть могла моргнуть — продолжаем опрос.
        }
      }, 2000);
    } catch {
      telegramWindow?.close();
      setFlow(null);
      setError("Не удалось подключиться. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isPasswordValid) {
      setError(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(form.email.trim(), form.password, form.displayName.trim());
      goTo("about");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось создать аккаунт. Возможно, этот email уже занят.",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (id: string) => {
    setInterests((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const finish = () => {
    if (!isBirthYearValid) {
      setError(`Укажите год от ${MIN_BIRTH_YEAR} до ${maxBirthYear()}.`);
      return;
    }
    localStorage.setItem(
      "perkly_onboarding_profile",
      JSON.stringify({ birthYear, interests, completedAt: new Date().toISOString() }),
    );
    goTo("done");
  };

  const goBack = () => {
    if (step === "email") {
      setFlow(null);
      goTo("start");
      return;
    }
    if (step === "about" && flow === "email") goTo("email");
  };

  const canGoBack = step === "email" || (step === "about" && flow === "email");

  return (
    <div className="pk pk-screen">
      {step !== "done" && (
        <>
          <div className="pk-nav">
            {canGoBack ? (
              <button type="button" onClick={goBack} className="pk-nav-back">
                <ChevronLeft aria-hidden="true" />
                Назад
              </button>
            ) : (
              <Link href="/" className="pk-nav-back">
                <ChevronLeft aria-hidden="true" />
                Perkly
              </Link>
            )}
            <span className="pk-nav-step">
              Шаг {stepIndex + 1} из {steps.length}
            </span>
          </div>
          <div className="pk-steps" aria-hidden="true">
            {steps.map((item, index) => (
              <i key={item} className={index <= stepIndex ? "is-done" : ""} />
            ))}
          </div>
        </>
      )}

      {step === "start" && (
        <StartStep
          loading={loading}
          waiting={tgWaiting}
          tgUrl={tgUrl}
          error={error}
          onTelegram={handleTelegram}
          onEmail={() => {
            setFlow("email");
            goTo("email");
          }}
          onCancel={cancelTelegram}
        />
      )}

      {step === "email" && (
        <EmailStep
          form={form}
          loading={loading}
          error={error}
          passwordValid={isPasswordValid}
          onChange={setForm}
          onSubmit={handleEmailSubmit}
        />
      )}

      {step === "about" && (
        <AboutStep
          birthYear={birthYear}
          interests={interests}
          error={error}
          isBirthYearValid={isBirthYearValid}
          onBirthYearChange={(value) => {
            setError("");
            setBirthYear(value.replace(/\D/g, "").slice(0, 4));
          }}
          onToggleInterest={toggleInterest}
          onFinish={finish}
        />
      )}

      {step === "done" && (
        <DoneStep
          interestCount={interests.length}
          onGoHome={() => router.push("/")}
          onOpenSettings={() => router.push("/settings")}
        />
      )}
    </div>
  );
}

function StartStep({
  loading,
  waiting,
  tgUrl,
  error,
  onTelegram,
  onEmail,
  onCancel,
}: {
  loading: boolean;
  waiting: boolean;
  tgUrl: string;
  error: string;
  onTelegram: () => void;
  onEmail: () => void;
  onCancel: () => void;
}) {
  if (waiting) {
    return (
      <>
        <h1 className="pk-title">Подтвердите вход</h1>
        <p className="pk-subtitle">
          Мы открыли бота Perkly в Telegram. Нажмите в нём кнопку подтверждения — этот экран
          обновится сам.
        </p>
        <div className="pk-status" style={{ marginTop: 32 }}>
          <span className="pk-status-mark pk-status-mark--wait">
            <Loader2 className="animate-spin" aria-hidden="true" />
          </span>
        </div>
        <div className="pk-actions">
          <a href={tgUrl} target="_blank" rel="noreferrer" className="pk-btn pk-btn--secondary">
            Открыть Telegram ещё раз
          </a>
          <button type="button" onClick={onCancel} className="pk-btn pk-btn--plain">
            Отменить
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="pk-title">Создайте Perkly ID</h1>
      <p className="pk-subtitle">
        Один аккаунт для промокодов, подписок и цифровых товаров.
      </p>

      <div className="pk-features">
        <div className="pk-feature">
          <Tag aria-hidden="true" />
          <div>
            <strong>Понятные условия</strong>
            <span>Цена, срок действия и способ выдачи видны до покупки.</span>
          </div>
        </div>
        <div className="pk-feature">
          <Zap aria-hidden="true" />
          <div>
            <strong>Мгновенная выдача</strong>
            <span>Коды и ключи приходят сразу после оплаты — в аккаунт и в Telegram.</span>
          </div>
        </div>
        <div className="pk-feature">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Защита платежа</strong>
            <span>Деньги удерживаются до подтверждения заказа. Спор — в один шаг.</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="pk-alert">
          <TriangleAlert aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="pk-actions">
        <button
          type="button"
          onClick={onTelegram}
          disabled={loading}
          className="pk-btn pk-btn--telegram"
        >
          {loading ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Image
              src="/brands/telegram.svg"
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
            />
          )}
          Продолжить с Telegram
        </button>
        <button type="button" onClick={onEmail} className="pk-btn pk-btn--secondary">
          <Mail aria-hidden="true" />
          Продолжить с email
        </button>
      </div>

      <p className="pk-note pk-note--center">
        Уже есть аккаунт? <Link href="/login">Войти</Link>
      </p>
      <p className="pk-footnote">
        Продолжая, вы принимаете <Link href="/terms">условия</Link> и{" "}
        <Link href="/privacy">политику конфиденциальности</Link>.
      </p>
    </>
  );
}

function EmailStep({
  form,
  loading,
  error,
  passwordValid,
  onChange,
  onSubmit,
}: {
  form: { displayName: string; email: string; password: string };
  loading: boolean;
  error: string;
  passwordValid: boolean;
  onChange: (value: { displayName: string; email: string; password: string }) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <h1 className="pk-title">Ваши данные</h1>
      <p className="pk-subtitle">Три поля — и аккаунт готов.</p>

      <div className="pk-fields">
        <label className="pk-field">
          <span>Имя</span>
          <input
            type="text"
            required
            autoComplete="nickname"
            placeholder="Как к вам обращаться"
            className="pk-input"
            value={form.displayName}
            onChange={(event) => onChange({ ...form, displayName: event.target.value })}
          />
        </label>

        <label className="pk-field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="pk-input"
            value={form.email}
            onChange={(event) => onChange({ ...form, email: event.target.value })}
          />
        </label>

        <label className="pk-field">
          <span>Пароль</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            placeholder="Не менее 8 символов"
            className="pk-input"
            value={form.password}
            onChange={(event) => onChange({ ...form, password: event.target.value })}
          />
          <span className="pk-field-hint">
            {form.password.length === 0
              ? "Минимум 8 символов."
              : passwordValid
                ? "Длина достаточная."
                : `Ещё ${MIN_PASSWORD_LENGTH - form.password.length} символов.`}
          </span>
        </label>
      </div>

      {error && (
        <p className="pk-alert">
          <TriangleAlert aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="pk-actions">
        <button type="submit" disabled={loading} className="pk-btn pk-btn--primary">
          {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : "Создать аккаунт"}
        </button>
      </div>
    </form>
  );
}

function AboutStep({
  birthYear,
  interests,
  error,
  isBirthYearValid,
  onBirthYearChange,
  onToggleInterest,
  onFinish,
}: {
  birthYear: string;
  interests: string[];
  error: string;
  isBirthYearValid: boolean;
  onBirthYearChange: (value: string) => void;
  onToggleInterest: (id: string) => void;
  onFinish: () => void;
}) {
  return (
    <>
      <h1 className="pk-title">Немного о вас</h1>
      <p className="pk-subtitle">
        Это влияет только на подборки. Изменить можно в любой момент.
      </p>

      <div className="pk-fields">
        <label className="pk-field">
          <span>Год рождения</span>
          <input
            inputMode="numeric"
            autoComplete="bday-year"
            placeholder={String(maxBirthYear() - 8)}
            className="pk-input"
            value={birthYear}
            onChange={(event) => onBirthYearChange(event.target.value)}
          />
          <span className="pk-field-hint">
            Нужен для возрастных ограничений. Другим пользователям он не виден.
          </span>
        </label>
      </div>

      <p className="pk-section">Интересы — необязательно</p>
      <div className="pk-grid">
        {INTERESTS.map((interest) => {
          const Icon = interest.icon;
          const active = interests.includes(interest.id);
          return (
            <button
              key={interest.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleInterest(interest.id)}
              className="pk-chip"
            >
              <Icon aria-hidden="true" />
              <span>{interest.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="pk-alert">
          <TriangleAlert aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="pk-actions">
        <button
          type="button"
          onClick={onFinish}
          disabled={!isBirthYearValid}
          className="pk-btn pk-btn--primary"
        >
          Готово
        </button>
      </div>
    </>
  );
}

function DoneStep({
  interestCount,
  onGoHome,
  onOpenSettings,
}: {
  interestCount: number;
  onGoHome: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div style={{ paddingTop: 48 }}>
      <div className="pk-status">
        <span className="pk-status-mark">
          <CheckCircle2 aria-hidden="true" />
        </span>
      </div>
      <h1 className="pk-title" style={{ textAlign: "center" }}>
        Аккаунт создан
      </h1>
      <p className="pk-subtitle" style={{ margin: "10px auto 0", textAlign: "center" }}>
        {interestCount > 0
          ? `Подборки настроены по ${interestCount} направлениям. Начислено 50 приветственных баллов.`
          : "Начислено 50 приветственных баллов."}
      </p>

      <div className="pk-actions">
        <button type="button" onClick={onGoHome} className="pk-btn pk-btn--primary">
          Перейти к предложениям
        </button>
        <button type="button" onClick={onOpenSettings} className="pk-btn pk-btn--plain">
          Открыть настройки
        </button>
      </div>
    </div>
  );
}
