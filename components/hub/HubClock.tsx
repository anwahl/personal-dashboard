'use client';

import { useState, useEffect } from 'react';

export function HubClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className="hub-clock" aria-live="polite" />;

  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="hub-clock" aria-live="polite">
      <div className="hub-clock__time">{time}</div>
      <div className="hub-clock__date">{date}</div>
    </div>
  );
}
