'use client';

/**
 * DayContext — the day placed components work on.
 *
 * On a daily page it's that page's date, its view/edit mode and its entry
 * (created on first save, with the page's intention). Everywhere else
 * (Home, Quick add) it's today, edit mode, and an entry created on first
 * save with a randomly picked intention.
 */

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureDailyEntry } from '@/lib/dal/daily';
import { localTodayISO } from '@/lib/utils/dates';

export interface Day {
  /** YYYY-MM-DD. */
  date:       string;
  mode:       'view' | 'input';
  /** The day's daily entry id, creating the entry if needed. */
  getEntryId: () => Promise<number>;
  /** True on a daily page (the date is that page's, not today). */
  onDailyPage: boolean;
}

const DayCtx = createContext<Day | null>(null);

/** The daily page's day (it owns entry creation and the mode). */
export function DailyDayProvider({ day, children }: Readonly<{ day: Omit<Day, 'onDailyPage'>; children: ReactNode }>) {
  const value = useMemo(() => ({ ...day, onDailyPage: true }), [day]);
  return <DayCtx.Provider value={value}>{children}</DayCtx.Provider>;
}

/** Today, for Home and Quick add. */
export function TodayProvider({ date, children }: Readonly<{ date: string; children: ReactNode }>) {
  const getEntryId = useCallback(() => ensureDailyEntry(createClient(), date), [date]);
  const value = useMemo<Day>(() => ({ date, mode: 'input', getEntryId, onDailyPage: false }), [date, getEntryId]);
  return <DayCtx.Provider value={value}>{children}</DayCtx.Provider>;
}

/**
 * "Today" for a component: the daily page's date when it's placed on one,
 * otherwise the actual date. Use it wherever a component would default a
 * date to today, so it follows the daily page it's on. Outside any
 * provider (the component's own page) it's simply today.
 */
export function useContextDate(): string {
  return useContext(DayCtx)?.date ?? localTodayISO();
}

export function useDay(): Day {
  const day = useContext(DayCtx);
  if (!day) throw new Error('useDay: no DailyDayProvider / TodayProvider above this component');
  return day;
}
