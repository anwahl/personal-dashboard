/**
 * lib/utils/dates.ts
 *
 * Shared date helpers used across the dashboard.
 * Centralises the ~6 independent copies of localTodayISO, addDays, fmtDate, etc.
 */

// ── Today helpers ─────────────────────────────────────────────────────────────

/**
 * Returns today's date in YYYY-MM-DD using the browser's LOCAL timezone.
 * Never use new Date().toISOString().slice(0,10) — that returns UTC, which is
 * wrong after ~6pm Mountain Time.
 */
export function localTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Date arithmetic ───────────────────────────────────────────────────────────

/**
 * Add (or subtract, for negative n) days to a YYYY-MM-DD string.
 * Uses noon to avoid DST edge cases.
 */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Formatting ────────────────────────────────────────────────────────────────

/**
 * "Monday, January 15, 2026"
 * Safe for YYYY-MM-DD strings (parses as local noon to avoid timezone issues).
 */
export function formatLongDate(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/**
 * "Jan 15, 2026"
 */
export function formatMediumDate(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

/**
 * "Jan 15"
 */
export function formatShortDate(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

// ── Relative helpers ──────────────────────────────────────────────────────────

/**
 * Returns "Today", "Tomorrow", "In 3d", "3d ago", etc.
 * contextDate defaults to today if omitted.
 */
export function daysUntil(targetDate: string, contextDate?: string): string {
  const from = contextDate ?? localTodayISO();
  const [ty, tm, td] = targetDate.split('-').map(Number);
  const [fy, fm, fd] = from.split('-').map(Number);
  const diff = Math.round(
    (new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86_400_000
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0)  return `${Math.abs(diff)}d ago`;
  return `In ${diff}d`;
}

/**
 * "Today", "Yesterday", "3d ago", "2w ago", "4mo ago", "1y ago", "Never"
 */
export function formatDaysAgo(days: number | null): string {
  if (days === null) return 'Never';
  if (days === 0)    return 'Today';
  if (days === 1)    return 'Yesterday';
  if (days < 7)     return `${days}d ago`;
  if (days < 30)    return `${Math.floor(days / 7)}w ago`;
  if (days < 365)   return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/**
 * "12:30 PM" from a "HH:MM:SS" time string. Returns null if falsy.
 */
export function formatTime(t: string | null | undefined): string | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
