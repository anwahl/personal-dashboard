'use client';

import { useState, useEffect } from 'react';
import Link                    from 'next/link';
import { usePathname }         from 'next/navigation';
import { createClient }        from '@/lib/supabase/client';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function localTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function buildCalendarDays(year: number, month: number): { date: string; thisMonth: boolean }[] {
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const startDay = first.getDay();   // 0 = Sunday
  const days: { date: string; thisMonth: boolean }[] = [];

  // Leading days from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, thisMonth: false });
  }

  // This month
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: `${year}-${pad(month + 1)}-${pad(d)}`, thisMonth: true });
  }

  // Trailing days to fill the grid
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(year, month + 1, d);
      days.push({ date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`, thisMonth: false });
    }
  }

  return days;
}

export function SideCalendar() {
  const pathname = usePathname();
  const today    = localTodayISO();
  const todayDate = new Date();

  const [year,      setYear]      = useState(todayDate.getFullYear());
  const [month,     setMonth]     = useState(todayDate.getMonth());   // 0-indexed
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set());

  // Active date from URL
  const urlMatch = pathname.match(/^\/daily\/(\d{4}-\d{2}-\d{2})$/);
  const activeDate = urlMatch ? urlMatch[1] : today;

  useEffect(() => {
    const supabase = createClient();
    const from = `${year}-${pad(month + 1)}-01`;
    const to   = `${year}-${pad(month + 1)}-${new Date(year, month + 1, 0).getDate()}`;

    supabase
      .from('daily_entries')
      .select('entry_date')
      .gte('entry_date', from)
      .lte('entry_date', to)
      .then(({ data }) => {
        setEntryDates(new Set((data ?? []).map((r: { entry_date: string }) => r.entry_date)));
      });
  }, [year, month]);

  const days = buildCalendarDays(year, month);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="side-calendar">
      {/* Month navigation */}
      <div className="side-calendar__nav">
        <button className="side-calendar__nav-btn" onClick={prevMonth} aria-label="Previous month">‹</button>
        <span className="side-calendar__month">{monthLabel}</span>
        <button className="side-calendar__nav-btn" onClick={nextMonth} aria-label="Next month">›</button>
      </div>

      {/* Day-of-week labels */}
      <div className="side-calendar__grid">
        {DAY_LABELS.map(l => (
          <div key={l} className="side-calendar__day-label">{l}</div>
        ))}

        {/* Day cells */}
        {days.map(({ date, thisMonth }) => {
          const isToday    = date === today;
          const isActive   = date === activeDate;
          const hasEntry   = entryDates.has(date);
          const dayNum     = parseInt(date.split('-')[2]);

          const cls = [
            'side-calendar__day',
            !thisMonth    ? 'side-calendar__day--other-month' : '',
            isToday       ? 'side-calendar__day--today' : '',
            isActive && !isToday ? 'side-calendar__day--active' : '',
          ].filter(Boolean).join(' ');

          return (
            <Link key={date} href={`/daily/${date}`} className={cls} aria-label={date}>
              <span className="side-calendar__day-num">{dayNum}</span>
              {hasEntry && <span className="side-calendar__dot" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
