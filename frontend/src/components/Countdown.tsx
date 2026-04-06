'use client';

import { useState, useEffect } from 'react';

interface CountdownProps {
  hours: number;
}

export default function Countdown({ hours }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(Math.round(hours * 3600));

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = Math.floor(timeLeft % 60);

  return (
    <span>
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}
