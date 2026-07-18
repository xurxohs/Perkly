"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Car,
  CheckCircle,
  Film,
  Gamepad2,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  Send,
  ShoppingBag,
  Sparkles,
  Ticket,
  Utensils,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const API_BASE =
  typeof window !== "undefined"
    ? "/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

type Step = "intro" | "method" | "email" | "birth" | "interests" | "success";

type Vibe = {
  code: string;
  title: string;
  text: string;
  signal: string;
};

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

function getVibe(year: string): Vibe {
  const parsed = Number(year);

  if (!year || Number.isNaN(parsed) || year.length < 4) {
    return {
      code: "Perkly Vibe",
      title: "Perkly читает твой ритм",
      text: "Введи год рождения, и мы соберем мягкую персонализацию без лишних вопросов.",
      signal: "ожидаем год",
    };
  }

  if (parsed <= 1989) {
    return {
      code: "Value Master",
      title: "Поколение точной выгоды",
      text: "Твой Perkly будет чаще поднимать проверенные предложения, понятную экономию и спокойные покупки.",
      signal: "надежность",
    };
  }

  if (parsed <= 1996) {
    return {
      code: "Smart Hunter",
      title: "Ты выбираешь быстро, но не случайно",
      text: "Perkly видит практичный вайб: меньше шума, больше офферов, которые сразу имеют смысл.",
      signal: "умная охота",
    };
  }

  if (parsed <= 2003) {
    return {
      code: "Drop Seeker",
      title: "Поколение быстрых решений",
      text: "Тебе ближе дропы, подписки, ивенты и бонусы, которые не надо долго искать.",
      signal: "скорость",
    };
  }

  return {
    code: "Trend Rider",
    title: "Твой Perkly-код любит новое",
    text: "Новые места, Топка, свежие подборки и короткие маршруты к выгоде будут попадаться чаще.",
    signal: "новизна",
  };
}

function currentMaxBirthYear() {
  return new Date().getFullYear() - 12;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, refreshUser, user } = useAuth();
  const [step, setStep] = useState<Step>("intro");
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    passwordHash: "",
  });
  const [birthYear, setBirthYear] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [tgStep, setTgStep] = useState<"idle" | "waiting">("idle");
  const [tgUrl, setTgUrl] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const vibe = useMemo(() => getVibe(birthYear), [birthYear]);
  const passName =
    formData.displayName.trim() || user?.displayName || "Новый участник";
  const passEmail =
    formData.email.trim() ||
    (user?.telegramId ? "Telegram подключен" : "perkly.id");

  const birthYearNumber = Number(birthYear);
  const isBirthYearValid =
    /^\d{4}$/.test(birthYear) &&
    birthYearNumber >= 1940 &&
    birthYearNumber <= currentMaxBirthYear();

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const goTo = (next: Step) => {
    setError("");
    setStep(next);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(
        formData.email,
        formData.passwordHash,
        formData.displayName,
      );
      goTo("birth");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Ошибка регистрации. Возможно, email уже занят.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const cancelTelegramLogin = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setTgStep("idle");
    setTgUrl("");
  };

  const handleTelegramLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/telegram-init`);
      const data = await res.json();
      setTgUrl(data.url);
      setTgStep("waiting");
      window.open(data.url, "_blank");
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(
            `${API_BASE}/auth/telegram-poll?token=${data.token}`,
          );
          const pollData = await pollRes.json();
          if (pollData.status === "ok" && pollData.access_token) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            localStorage.setItem("perkly_token", pollData.access_token);
            await refreshUser();
            setTgStep("idle");
            goTo("birth");
          } else if (pollData.status === "expired") {
            cancelTelegramLogin();
            setError("Время ожидания вышло. Попробуйте снова.");
          }
        } catch {
          // keep polling
        }
      }, 2000);
    } catch {
      setError("Не удалось подключиться. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  };

  const handleBirthNext = () => {
    if (!isBirthYearValid) {
      setError(`Введите год от 1940 до ${currentMaxBirthYear()}.`);
      return;
    }
    goTo("interests");
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((current) =>
      current.includes(interestId)
        ? current.filter((id) => id !== interestId)
        : [...current, interestId],
    );
  };

  const finishOnboarding = () => {
    const payload = {
      birthYear,
      vibeCode: vibe.code,
      interests: selectedInterests,
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem("perkly_onboarding_profile", JSON.stringify(payload));
    goTo("success");
  };

  const selectedInterestLabels = INTERESTS.filter((interest) =>
    selectedInterests.includes(interest.id),
  ).map((interest) => interest.label);

  return (
    <div className="relative flex min-h-[80vh] w-full items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:py-12">
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(168,85,247,0.075)_0%,rgba(236,72,153,0.035)_32%,rgba(0,0,0,0)_70%)]" />

      <section className="grid w-full max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <PerklyPass
          passName={passName}
          passEmail={passEmail}
          vibe={vibe}
          selectedInterestLabels={selectedInterestLabels}
          step={step}
        />

        <div className="glass-card w-full p-5 sm:p-7 lg:p-8">
          <div className="relative z-10">
            <StepHeader step={step} />
            <MobilePass
              passName={passName}
              passEmail={passEmail}
              vibe={vibe}
              selectedInterestLabels={selectedInterestLabels}
            />

            {step === "intro" && <IntroStep onNext={() => goTo("method")} />}

            {step === "method" && (
              <MethodStep
                loading={loading}
                tgStep={tgStep}
                tgUrl={tgUrl}
                error={error}
                onTelegram={handleTelegramLogin}
                onEmail={() => goTo("email")}
                onCancelTelegram={cancelTelegramLogin}
              />
            )}

            {step === "email" && (
              <EmailStep
                formData={formData}
                loading={loading}
                error={error}
                onChange={setFormData}
                onSubmit={handleEmailSubmit}
                onBack={() => goTo("method")}
              />
            )}

            {step === "birth" && (
              <BirthStep
                birthYear={birthYear}
                vibe={vibe}
                error={error}
                isValid={isBirthYearValid}
                onChange={(value) => {
                  setError("");
                  setBirthYear(value.replace(/\D/g, "").slice(0, 4));
                }}
                onNext={handleBirthNext}
              />
            )}

            {step === "interests" && (
              <InterestsStep
                selectedInterests={selectedInterests}
                onToggle={toggleInterest}
                onSkip={finishOnboarding}
                onFinish={finishOnboarding}
              />
            )}

            {step === "success" && (
              <SuccessStep
                vibe={vibe}
                selectedInterestCount={selectedInterests.length}
                onGoHome={() => router.push("/")}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StepHeader({ step }: { step: Step }) {
  const copy: Record<Step, { eyebrow: string; title: string; text: string }> = {
    intro: {
      eyebrow: "Perkly Pass",
      title: "Активируй доступ",
      text: "Скидки, купоны, дропы и бонусы в одном аккаунте.",
    },
    method: {
      eyebrow: "Быстрый старт",
      title: "Как войдем?",
      text: "Telegram быстрее. Email оставили как спокойную альтернативу.",
    },
    email: {
      eyebrow: "Email ID",
      title: "Создай профиль",
      text: "Три поля, без лишней анкеты.",
    },
    birth: {
      eyebrow: "Perkly Vibe",
      title: "Твой год рождения",
      text: "Perkly подстроит подборки, события и бонусы под твой ритм.",
    },
    interests: {
      eyebrow: "Персонализация",
      title: "Что тебе ближе?",
      text: "Выбери несколько направлений. Это можно пропустить.",
    },
    success: {
      eyebrow: "Готово",
      title: "Pass активирован",
      text: "Твой Perkly уже собрал первые сигналы.",
    },
  };

  const current = copy[step];

  return (
    <div className="mb-7 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          {current.title}
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-white/48">
          {current.text}
        </p>
      </div>
      <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-gradient shadow-primary-glow sm:flex">
        <Sparkles className="h-7 w-7 text-white" />
      </div>
    </div>
  );
}

function PerklyPass({
  passName,
  passEmail,
  vibe,
  selectedInterestLabels,
  step,
}: {
  passName: string;
  passEmail: string;
  vibe: Vibe;
  selectedInterestLabels: string[];
  step: Step;
}) {
  return (
    <div className="glass-card hidden min-h-[650px] flex-col justify-between p-7 md:flex">
      <div className="relative z-10">
        <div className="mb-7 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <span className="h-8 w-8 rounded-full bg-primary-gradient shadow-primary-glow" />
            <span className="text-xl font-bold tracking-tight text-white">
              Perkly
            </span>
          </Link>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/60">
            ID Preview
          </span>
        </div>

        <div className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[linear-gradient(135deg,rgba(168,85,247,0.38),rgba(236,72,153,0.2)_52%,rgba(34,211,238,0.18))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex min-h-[230px] flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/55">
                  Perkly Pass
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                  Silver
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/25 ring-1 ring-white/15">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>

            <div>
              <p className="truncate text-lg font-bold text-white">
                {passName}
              </p>
              <p className="mt-1 truncate text-sm text-white/55">{passEmail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-black">
                  {vibe.code}
                </span>
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-bold text-white/70">
                  +50 welcome points
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid gap-3">
        <div className="rounded-2xl bg-white/[0.035] p-4 ring-1 ring-white/[0.06]">
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-purple-300" />
            <p className="text-sm font-bold text-white">{vibe.title}</p>
          </div>
          <p className="text-xs leading-5 text-white/42">{vibe.text}</p>
        </div>

        <div className="rounded-2xl bg-white/[0.035] p-4 ring-1 ring-white/[0.06]">
          <p className="text-sm font-bold text-white">Интересы</p>
          <p className="mt-1 text-xs leading-5 text-white/42">
            {selectedInterestLabels.length > 0
              ? selectedInterestLabels.join(", ")
              : step === "interests"
                ? "выбери то, что хочется видеть чаще"
                : "появятся после выбора"}
          </p>
        </div>
      </div>
    </div>
  );
}

function MobilePass({
  passName,
  passEmail,
  vibe,
  selectedInterestLabels,
}: {
  passName: string;
  passEmail: string;
  vibe: Vibe;
  selectedInterestLabels: string[];
}) {
  return (
    <div className="mb-6 rounded-[1.25rem] bg-[linear-gradient(135deg,rgba(168,85,247,0.25),rgba(236,72,153,0.12),rgba(34,211,238,0.1))] p-4 ring-1 ring-white/10 md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">
            Perkly Pass
          </p>
          <p className="mt-2 truncate text-base font-bold text-white">
            {passName}
          </p>
          <p className="truncate text-xs text-white/45">{passEmail}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-black">
          {vibe.code}
        </span>
      </div>
      {selectedInterestLabels.length > 0 && (
        <p className="mt-3 truncate text-xs text-white/45">
          {selectedInterestLabels.join(", ")}
        </p>
      )}
    </div>
  );
}

function IntroStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Дропы", "ранний доступ"],
          ["Купоны", "быстрая выгода"],
          ["Топка", "места и события"],
        ].map(([title, text]) => (
          <div
            key={title}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
          >
            <p className="font-bold text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-white/42">{text}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-primary-gradient px-4 py-4 font-bold text-white shadow-primary-glow transition-all hover:opacity-90"
      >
        Активировать Pass <ArrowRight className="h-5 w-5" />
      </button>

      <p className="text-center text-sm text-white/48">
        Уже есть аккаунт?{" "}
        <Link
          href="/login"
          className="font-semibold text-purple-300 transition-colors hover:text-purple-200"
        >
          Войти
        </Link>
      </p>
    </div>
  );
}

function MethodStep({
  loading,
  tgStep,
  tgUrl,
  error,
  onTelegram,
  onEmail,
  onCancelTelegram,
}: {
  loading: boolean;
  tgStep: "idle" | "waiting";
  tgUrl: string;
  error: string;
  onTelegram: () => void;
  onEmail: () => void;
  onCancelTelegram: () => void;
}) {
  if (tgStep === "waiting") {
    return (
      <div className="rounded-2xl border border-[#0088cc]/20 bg-[#0088cc]/10 p-5 text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-400" />
        <p className="mb-1 font-semibold text-white">
          Подтвердите вход в Telegram
        </p>
        <p className="mb-4 text-sm leading-6 text-white/42">
          Откройте бот и нажмите кнопку подтверждения номера.
        </p>
        <a
          href={tgUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-3 inline-flex items-center gap-1 text-sm text-blue-300 underline"
        >
          Открыть бот <ArrowRight className="h-3 w-3" />
        </a>
        <div>
          <button
            onClick={onCancelTelegram}
            className="cursor-pointer border-0 bg-transparent text-xs text-white/32 transition hover:text-white/60"
          >
            Отменить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onTelegram}
        disabled={loading}
        className="shadow-telegram-glow flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border-0 bg-telegram-gradient px-4 py-4 text-base font-bold text-white transition-all hover:opacity-90 disabled:opacity-70"
      >
        <Send className="h-5 w-5" />
        Быстро через Telegram
      </button>

      <button
        onClick={onEmail}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 text-base font-bold text-white transition-all hover:bg-white/[0.07]"
      >
        <Mail className="h-5 w-5 text-white/70" />
        Продолжить по email
      </button>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-center text-sm font-medium text-rose-300">
          {error}
        </div>
      )}
    </div>
  );
}

function EmailStep({
  formData,
  loading,
  error,
  onChange,
  onSubmit,
  onBack,
}: {
  formData: { displayName: string; email: string; passwordHash: string };
  loading: boolean;
  error: string;
  onChange: (data: {
    displayName: string;
    email: string;
    passwordHash: string;
  }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <FieldIcon icon={<User className="h-5 w-5" />}>
        <input
          type="text"
          required
          placeholder="Ваш никнейм"
          className={fieldClassName}
          value={formData.displayName}
          onChange={(e) =>
            onChange({ ...formData, displayName: e.target.value })
          }
        />
      </FieldIcon>

      <FieldIcon icon={<Mail className="h-5 w-5" />}>
        <input
          type="email"
          required
          placeholder="E-mail адрес"
          className={fieldClassName}
          value={formData.email}
          onChange={(e) => onChange({ ...formData, email: e.target.value })}
        />
      </FieldIcon>

      <FieldIcon icon={<Lock className="h-5 w-5" />}>
        <input
          type="password"
          required
          placeholder="Придумайте пароль"
          className={fieldClassName}
          value={formData.passwordHash}
          onChange={(e) =>
            onChange({ ...formData, passwordHash: e.target.value })
          }
        />
      </FieldIcon>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-center text-sm font-medium text-rose-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-primary-gradient px-4 py-4 font-bold text-white shadow-primary-glow transition-all hover:opacity-90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Создать аккаунт <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="mx-auto flex cursor-pointer items-center gap-2 border-0 bg-transparent text-sm font-semibold text-white/45 transition hover:text-white/70"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>
    </form>
  );
}

function BirthStep({
  birthYear,
  vibe,
  error,
  isValid,
  onChange,
  onNext,
}: {
  birthYear: string;
  vibe: Vibe;
  error: string;
  isValid: boolean;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-5">
        <label className="block text-center">
          <span className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-white/35">
            год рождения
          </span>
          <input
            inputMode="numeric"
            autoComplete="bday-year"
            placeholder="2001"
            value={birthYear}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border-0 bg-transparent text-center text-5xl font-black tracking-tight text-white outline-none placeholder:text-white/16 sm:text-6xl"
          />
        </label>
      </div>

      <div className="rounded-[1.25rem] border border-purple-400/15 bg-[linear-gradient(135deg,rgba(168,85,247,0.12),rgba(236,72,153,0.08),rgba(255,255,255,0.025))] p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-300" />
            <p className="text-sm font-black text-gradient">{vibe.code}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white/45">
            {vibe.signal}
          </span>
        </div>
        <p className="text-base font-bold text-white">{vibe.title}</p>
        <p className="mt-2 text-sm leading-6 text-white/48">{vibe.text}</p>
        <p className="mt-4 text-xs text-white/28">
          Это не астрология. Просто немного магии интерфейса.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-center text-sm font-medium text-rose-300">
          {error}
        </div>
      )}

      <button
        onClick={onNext}
        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 px-4 py-4 font-bold text-white transition-all ${
          isValid
            ? "bg-primary-gradient shadow-primary-glow hover:opacity-90"
            : "bg-white/[0.08] text-white/45"
        }`}
      >
        Продолжить <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function InterestsStep({
  selectedInterests,
  onToggle,
  onSkip,
  onFinish,
}: {
  selectedInterests: string[];
  onToggle: (interestId: string) => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {INTERESTS.map((interest) => {
          const Icon = interest.icon;
          const active = selectedInterests.includes(interest.id);

          return (
            <button
              key={interest.id}
              onClick={() => onToggle(interest.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-purple-400/35 bg-purple-500/15 text-white shadow-[0_0_24px_rgba(168,85,247,0.12)]"
                  : "border-white/10 bg-white/[0.035] text-white/60 hover:bg-white/[0.06]"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  active ? "bg-primary-gradient" : "bg-white/[0.06]"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold">{interest.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={onFinish}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-primary-gradient px-4 py-4 font-bold text-white shadow-primary-glow transition-all hover:opacity-90"
        >
          Готово <ArrowRight className="h-5 w-5" />
        </button>
        <button
          onClick={onSkip}
          className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 font-bold text-white/55 transition hover:bg-white/[0.06] hover:text-white/75"
        >
          Пропустить
        </button>
      </div>
    </div>
  );
}

function SuccessStep({
  vibe,
  selectedInterestCount,
  onGoHome,
}: {
  vibe: Vibe;
  selectedInterestCount: number;
  onGoHome: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-green-400/20 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.12)]">
        <CheckCircle className="h-9 w-9 text-green-400" />
      </div>

      <div>
        <p className="text-2xl font-black text-white">
          Твой Perkly Pass активен
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/48">
          {vibe.code}, Silver, +50 welcome points
          {selectedInterestCount > 0
            ? ` и ${selectedInterestCount} интересов для подборок.`
            : "."}
        </p>
      </div>

      <button
        onClick={onGoHome}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-white px-4 py-4 font-black text-black transition hover:bg-white/90"
      >
        Смотреть предложения <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3.5 pl-11 pr-4 font-medium text-white outline-none transition-all placeholder:text-white/30 focus:border-purple-400/35 focus:bg-white/[0.07] focus:ring-2 focus:ring-purple-500/20";

function FieldIcon({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/38">
        {icon}
      </span>
      {children}
    </label>
  );
}
