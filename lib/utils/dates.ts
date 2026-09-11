/**
 * lib/utils/dates.ts
 *
 * Shared date helpers used across the dashboard.
 */
 
const p = (n: number) => String(n).padStart(2, '0');

// ── Today helpers ─────────────────────────────────────────────────────────────

/**
 * Returns today's date in YYYY-MM-DD using the browser's LOCAL timezone.
 * Never use new Date().toISOString().slice(0,10) — that returns UTC, which is
 * wrong after ~6pm Mountain Time.
 */
export function localTodayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

export function toLocalInput(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function dateWithOffset(date: Date) {
  const offsetMin = date.getTimezoneOffset();
  const offsetSign = offsetMin <= 0 ? '+' : '-';
  const absOffsetMin = Math.abs(offsetMin);

  // Format timezone hours and minutes (e.g., 06:00)
  const hh = String(Math.floor(absOffsetMin / 60)).padStart(2, '0');
  const mm = String(absOffsetMin % 60).padStart(2, '0');
  const tzOffset = `${offsetSign}${hh}:${mm}`;

  // Shift date by timezone offset to construct exact local parts
  const localShifted = new Date(date.getTime() - (offsetMin * 60 * 1000));
  const pureISO = localShifted.toISOString().slice(0, -1); // Remove trailing 'Z'

  const newDate = new Date(`${pureISO}${tzOffset}`);
  return newDate;
}

/**
 * Returns the provided date as ISO date using the browser's LOCAL timezone.
 */
export function localISODateFromDateString(dateStr: string): string {
    const newDate = dateWithOffset(new Date(dateStr + "T12:00:00"));
    return `${newDate.getFullYear()}-${p(newDate.getMonth()+1)}-${p(newDate.getDate())}`;
}

export function localISODateTimeFromDateString(dateStr: string): string {
    const newDate = dateWithOffset(new Date(dateStr));
    return `${newDate.getFullYear()}-${p(newDate.getMonth()+1)}-${p(newDate.getDate())}T${String(newDate.getHours())}:${String(newDate.getMinutes())}`;
}

export function localISODate(date: Date): string {
    const newDate = dateWithOffset(date);
    return `${newDate.getFullYear()}-${p(newDate.getMonth()+1)}-${p(newDate.getDate())}`;
}

// ── Date arithmetic ───────────────────────────────────────────────────────────

/**
 * Add (or subtract, for negative n) days to a YYYY-MM-DD string.
 * Uses noon to avoid DST edge cases.
 */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localISODate(d).slice(0, 10);
}

// ── Formatting ────────────────────────────────────────────────────────────────

/**
 * "Monday, January 15, 2026"
 * Safe for YYYY-MM-DD strings (parses as local noon to avoid timezone issues).
 */
export function formatLongDate(d: string | null): string {
  if (!d) return "—";
  
  // Split date and time parts (e.g., "2026-08-08T14:30:00" -> ["2026-08-08", "14:30:00"])
  const [datePart, timePart] = d.split("T");
  const [y, m, day] = datePart.split("-").map(Number);
  
  const dateObj = new Date(y, m - 1, day);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (!timePart) return formattedDate;

  // Parse hours and minutes from the time part
  const [h, min] = timePart.split(":").map(Number);
  const timeObj = new Date();
  timeObj.setHours(h, min);

  const formattedTime = timeObj.toLocaleTimeString("en-US", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${formattedDate} at ${formattedTime}`;
}


/**
 * "Jan 15, 2026"
 */
export function formatMediumDate(d: string | null): string {
  if (!d) return "—";
  
  // Split date and time parts (e.g., "2026-08-08T14:30:00" -> ["2026-08-08", "14:30:00"])
  const [datePart, timePart] = d.split("T");
  const [y, m, day] = datePart.split("-").map(Number);
  
  const dateObj = new Date(y, m - 1, day);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (!timePart) return formattedDate;

  // Parse hours and minutes from the time part
  const [h, min] = timePart.split(":").map(Number);
  const timeObj = new Date();
  timeObj.setHours(h, min);

  const formattedTime = timeObj.toLocaleTimeString("en-US", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${formattedDate} at ${formattedTime}`;
}

/**
 * "Jan 15"
 */
export function formatShortDate(d: string | null): string {
  if (!d) return "—";
  
  // Split date and time parts (e.g., "2026-08-08T14:30:00" -> ["2026-08-08", "14:30:00"])
  const [datePart, timePart] = d.split("T");
  const [y, m, day] = datePart.split("-").map(Number);
  
  const dateObj = new Date(y, m - 1, day);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (!timePart) return formattedDate;

  // Parse hours and minutes from the time part
  const [h, min] = timePart.split(":").map(Number);
  const timeObj = new Date();
  timeObj.setHours(h, min);

  const formattedTime = timeObj.toLocaleTimeString("en-US", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${formattedDate} at ${formattedTime}`;
}

// ── Relative helpers ──────────────────────────────────────────────────────────

/**
 * Returns "Today", "Tomorrow", "In 3d", "3d ago", etc.
 * contextDate defaults to today if omitted.
 */
export function daysUntil(targetDate: string, contextDate?: string): string {
  const from = contextDate ?? localTodayISO();
  const [ty, tm, td] = targetDate.split("-").map(Number);
  const [fy, fm, fd] = from.split("-").map(Number);
  const diff = Math.round(
    (new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) /
      86_400_000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `In ${diff}d`;
}

/**
 * "Today", "Yesterday", "3d ago", "2w ago", "4mo ago", "1y ago", "Never"
 */
export function formatDaysAgo(days: number | null): string {
  if (days === null) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/**
 * "12:30 PM" from a "HH:MM:SS" time string. Returns null if falsy.
 */
export function formatTime(t: string | null | undefined): string | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ── Week helpers (Sunday-based) ───────────────────────────────────────────────

/** Returns the YYYY-MM-DD of the Sunday starting the week that contains dateStr. */
export function getSundayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day  = date.getDay(); // 0 = Sunday
  if (day !== 0) date.setDate(date.getDate() - day);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Sunday that starts the current week. */
export function currentWeekStart(): string {
  return getSundayOfWeek(localTodayISO());
}

/**
 * Sunday-based week number within the year.
 * Week 1 = the week containing Jan 1 (or starting before it if Jan 1 is mid-week).
 */
export function getSundayWeekNumber(dateStr: string): number {
  const sunday    = getSundayOfWeek(dateStr);
  const [y, m, d] = sunday.split('-').map(Number);
  const jan1      = new Date(y, 0, 1);
  const sunDate   = new Date(y, m - 1, d);
  const jan1Sunday = new Date(y, 0, 1 - jan1.getDay()); // roll back to sunday
  const diffMs    = sunDate.getTime() - jan1Sunday.getTime();
  return Math.floor(diffMs / (7 * 86_400_000)) + 1;
}

/**
 * "Jan 5–11" — human-readable week range from a Sunday date.
 * End date is the Saturday 6 days later; drops redundant month on end.
 */
export function formatWeekRange(sundayStr: string): string {
  const [y, m, d] = sundayStr.split('-').map(Number);
  const sun = new Date(y, m - 1, d);
  const sat = new Date(y, m - 1, d + 6);
  const startLabel = sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel   = sat.getMonth() === sun.getMonth()
    ? String(sat.getDate())
    : sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startLabel}–${endLabel}`;
}

export function getWeekDates(anchorDate: string): string[] {
  const d = new Date(anchorDate + "T12:00:00");
  const dow = d.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const wd = new Date(d);
    wd.setDate(d.getDate() - dow + i);
    return localISODate(wd).slice(0, 10);
  });
}