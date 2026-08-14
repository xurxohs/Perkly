"use client";

// Вход: тот же строгий каркас, что и на регистрации, без декоративных слоёв.

import { Suspense, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, Loader2, TriangleAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useTelegram } from "@/hooks/useTelegram";

const API_BASE =
  typeof window !== "undefined"
    ? "/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered");
  const requestedNext = searchParams.get("next");
  const nextPath =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";

  const { login, refreshUser } = useAuth();
  const { initData, isTMA, hapticNotification } = useTelegram();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tgStep, setTgStep] = useState<"idle" | "waiting" | "done">("idle");
  const [tgUrl, setTgUrl] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Внутри Telegram Mini App вход происходит автоматически.
  useEffect(() => {
    if (!initData || !isTMA) return;
    setLoading(true);
    fetch(`${API_BASE}/auth/telegram-miniapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ initData }),
    })
      .then((res) => res.json())
      .then(async (data) => {
        if (!data.user) return;
        await refreshUser();
        hapticNotification("success");
        setTgStep("done");
        setTimeout(() => router.push(nextPath), 500);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initData, isTMA, router, hapticNotification, nextPath, refreshUser]);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const cancelTelegram = () => {
    stopPolling();
    setTgStep("idle");
    setTgUrl("");
  };

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.email.trim(), form.password);
      router.push(nextPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Неверный email или пароль.");
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramLogin = async () => {
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
      setTgStep("waiting");
      if (telegramWindow) telegramWindow.location.href = data.url;

      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(
            `${API_BASE}/auth/telegram-poll?token=${data.token}`,
            { credentials: "include" },
          );
          const pollData = await pollRes.json();
          if (pollData.status === "ok") {
            stopPolling();
            await refreshUser();
            hapticNotification("success");
            setTgStep("done");
            setTimeout(() => router.push(nextPath), 700);
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
      setTgStep("idle");
      setError("Не удалось подключиться. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  };

  if (tgStep === "done") {
    return (
      <div style={{ paddingTop: 56 }}>
        <div className="pk-status">
          <span className="pk-status-mark">
            <CheckCircle2 aria-hidden="true" />
          </span>
        </div>
        <h1 className="pk-title" style={{ textAlign: "center" }}>
          Вы вошли
        </h1>
        <p className="pk-subtitle" style={{ margin: "10px auto 0", textAlign: "center" }}>
          Открываем Perkly.
        </p>
      </div>
    );
  }

  if (tgStep === "waiting") {
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
          <button type="button" onClick={cancelTelegram} className="pk-btn pk-btn--plain">
            Отменить
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="pk-title">Вход</h1>
      <p className="pk-subtitle">Через Telegram или по email — аккаунт один и тот же.</p>

      {isRegistered && (
        <p className="pk-alert pk-alert--info">
          <CheckCircle2 aria-hidden="true" />
          Аккаунт создан. Теперь войдите в него.
        </p>
      )}

      <div className="pk-actions">
        <button
          type="button"
          onClick={handleTelegramLogin}
          disabled={loading}
          className="pk-btn pk-btn--telegram"
        >
          {loading ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Image src="/brands/telegram.svg" alt="" width={20} height={20} aria-hidden="true" />
          )}
          Войти через Telegram
        </button>
      </div>
      <p className="pk-note pk-note--center">Бот попросит подтвердить номер телефона.</p>

      <div className="pk-or">или</div>

      <form onSubmit={handleEmailLogin}>
        <div className="pk-fields" style={{ marginTop: 0 }}>
          <label className="pk-field">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="pk-input"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>

          <label className="pk-field">
            <span>Пароль</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Ваш пароль"
              className="pk-input"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
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
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : "Войти"}
          </button>
        </div>
      </form>

      <p className="pk-note pk-note--center">
        Нет аккаунта? <Link href="/register">Создать</Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="pk pk-screen">
      <div className="pk-nav">
        <Link href="/" className="pk-nav-back">
          <ChevronLeft aria-hidden="true" />
          Perkly
        </Link>
      </div>
      <Suspense
        fallback={
          <p className="pk-subtitle" style={{ marginTop: 32 }}>
            Загрузка…
          </p>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
