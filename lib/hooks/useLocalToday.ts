'use client';

/**
 * useLocalToday — today's date (YYYY-MM-DD) in the browser's time zone.
 *
 * Calling localTodayISO() directly while rendering a client component gives
 * a different answer on the server (UTC) than in the browser after ~6pm
 * Mountain time, so links built from it mismatch during hydration.
 *
 * This hook returns null during server rendering and hydration, then the
 * browser's local date. Callers fall back to a date-less link (or render
 * nothing) while it is null.
 */

import { useSyncExternalStore } from 'react';
import { localTodayISO }        from '@/lib/utils/dates';

// The date only changes at midnight; a page left open past midnight picks up
// the new date on its next render, which is enough for navigation links.
const subscribe         = () => () => {};
const getSnapshot       = () => localTodayISO();
const getServerSnapshot = () => null;

export function useLocalToday(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Link to the daily entry for today, or the daily index before hydration. */
export function useTodayHref(query?: string): string {
  const today = useLocalToday();
  const base  = today ? `/daily/${today}` : '/daily';
  return query ? `${base}?${query}` : base;
}
