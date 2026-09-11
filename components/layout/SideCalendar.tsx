'use client';

import { useState, useEffect } from 'react';
import Link                    from 'next/link';
import { usePathname }         from 'next/navigation';
import { createClient }        from '@/lib/supabase/client';
import { localTodayISO, getSundayOfWeek, getSundayWeekNumber } from '@/lib/utils/dates';
import { DAY_LABELS } from '@/lib/constants/dates';

const pad = (n: number) => String(n).padStart(2, '0');

function buildCalendarDays(year: number, month: number) {
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const days: { date: string; thisMonth: boolean }[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, thisMonth: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: `${year}-${pad(month+1)}-${pad(d)}`, thisMonth: true });
  }
  const rem = 7 - (days.length % 7);
  if (rem < 7) {
    for (let d = 1; d <= rem; d++) {
      const dt = new Date(year, month + 1, d);
      days.push({ date: `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`, thisMonth: false });
    }
  }
  return days;
}

export function SideCalendar() {
  const pathname  = usePathname();
  const today     = localTodayISO();
  const todayDate = new Date();

  const [year,        setYear]        = useState(todayDate.getFullYear());
  const [month,       setMonth]       = useState(todayDate.getMonth());
  const [entryDates,  setEntryDates]  = useState<Set<string>>(new Set());
  const [weeklyDates, setWeeklyDates] = useState<Set<string>>(new Set());

  const activeDate = /^\/daily\/(\d{4}-\d{2}-\d{2})$/.exec(pathname)?.[1] ?? today;

  useEffect(() => {
    const supabase = createClient();
    const from = `${year}-${pad(month+1)}-01`;
    const to   = `${year}-${pad(month+1)}-${new Date(year, month+1, 0).getDate()}`;

    supabase.from('daily_entries').select('entry_date')
      .gte('entry_date', from).lte('entry_date', to)
      .then(({ data }) => setEntryDates(new Set((data ?? []).map((r: { entry_date: string }) => r.entry_date))));

    // Fetch weekly entries whose Sunday falls in or just before this month
    const fromSun = getSundayOfWeek(from);
    supabase.from('weekly_entries').select('week_start_date')
      .gte('week_start_date', fromSun).lte('week_start_date', to)
      .then(({ data }) => setWeeklyDates(new Set((data ?? []).map((r: { week_start_date: string }) => r.week_start_date))));
  }, [year, month]);//FIXME Move the queries outta here

  const days = buildCalendarDays(year, month);
  const weeks: { date: string; thisMonth: boolean }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const prevMonth = () => month === 0  ? (setYear(y => y-1), setMonth(11)) : setMonth(m => m-1);
  const nextMonth = () => month === 11 ? (setYear(y => y+1), setMonth(0))  : setMonth(m => m+1);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="side-calendar">
      <div className="side-calendar__nav">
        <button className="side-calendar__nav-btn" onClick={prevMonth} aria-label="Previous month">‹</button>
        <span className="side-calendar__month">{monthLabel}</span>
        <button className="side-calendar__nav-btn" onClick={nextMonth} aria-label="Next month">›</button>
      </div>

      <div className="side-calendar__grid--with-weeks">
        {/* Header */}
        <div className="side-calendar__week-label">Wk</div>
        {DAY_LABELS.map(l => <div key={l} className="side-calendar__day-label">{l}</div>)}

        {/* Week rows */}
        {weeks.map(week => {
          const sunday   = week[0].date;
          const weekNum  = getSundayWeekNumber(sunday);
          const hasEntry = weeklyDates.has(sunday);
          return (
            <div key={sunday} style={{ display: 'contents' }}>
              <Link
                href={`/journal/weekly/${sunday}`}
                className={`side-calendar__week-num${hasEntry ? ' side-calendar__week-num--has-entry' : ''}`}
                title={`Week ${weekNum} · open weekly journal`}
              >
                {weekNum}
              </Link>
              {week.map(({ date, thisMonth }) => {
                const isToday  = date === today;
                const isActive = date === activeDate;
                const hasDot   = entryDates.has(date);
                const dayNum   = Number.parseInt(date.split('-')[2]);
                const cls = [
                  'side-calendar__day',
                  !thisMonth ? 'side-calendar__day--other-month' : '',
                  isToday    ? 'side-calendar__day--today' : '',
                  isActive && !isToday ? 'side-calendar__day--active' : '',
                ].filter(Boolean).join(' ');
                return (
                  <Link key={date} href={`/daily/${date}`} className={cls} aria-label={date}>
                    <span className={`side-calendar__day-num${hasDot ? ' side-calendar__dot' : ''}`}>
                      {dayNum}
                    </span> 
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
