/**
 * lib/utils/ical.ts
 *
 * RFC 5545 iCal generation utilities.
 *
 * Handles:
 *  - Line folding (75-octet limit, CRLF + SPACE continuation)
 *  - Text value escaping (commas, semicolons, backslashes, newlines)
 *  - UTC date/time formatting
 *  - RRULE string generation from recurrence columns
 *  - Full VCALENDAR builder
 */

import type { TaskRow } from '@/types/schema';
import { localTodayISO, localISODate, localISODateFromDateString } from '@/lib/utils/dates';

// ── Low-level formatting ──────────────────────────────────────────────────────

/** RFC 5545 §3.1 — fold lines at 75 octets using CRLF + SPACE. */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      chunks.push(line.slice(0, 75));
      i = 75;
    } else {
      chunks.push(' ' + line.slice(i, i + 74));
      i += 74;
    }
  }
  return chunks.join('\r\n');
}

/** RFC 5545 §3.3.11 — escape TEXT values. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n|\r\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Formats an ISO 8601 date-time string to iCal UTC format: YYYYMMDDTHHMMSSz
 * Milliseconds are stripped; Z suffix is preserved.
 */
export function toICalDateTime(iso: string): string {
  return iso
    .replace(/-/g, '')
    .replace(/:/g, '')
    .replace(/\.\d+/, '')   // strip ms
    .toUpperCase();          // ensure Z is uppercase
}

/**
 * Formats an ISO date string (YYYY-MM-DD) to iCal DATE format: YYYYMMDD.
 * Used for UNTIL when the end is a whole day.
 */
function toICalDateOnly(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

// ── RRULE builder ─────────────────────────────────────────────────────────────

/**
 * Converts a task's recurrence columns into an RFC 5545 RRULE string.
 * Returns null if the task has no recurrence.
 *
 * Examples:
 *   "Every 2 weeks on Mon/Wed" → "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE"
 *   "Yearly until 2027-12-31"  → "RRULE:FREQ=YEARLY;UNTIL=20271231T235959Z"
 */
export function buildRRule(task: TaskRow): string | null {
  if (!task.recurrence_frequency) return null;

  const parts: string[] = [
    `FREQ=${task.recurrence_frequency.toUpperCase()}`,
  ];

  const interval = task.recurrence_interval ?? 1;
  if (interval > 1) parts.push(`INTERVAL=${interval}`);

  // BYDAY only meaningful for WEEKLY (and sometimes MONTHLY, but we keep it simple)
  if (task.recurrence_frequency === 'weekly' && task.recurrence_days) {
    parts.push(`BYDAY=${task.recurrence_days}`);
  }

  if (task.recurrence_end_date) {
    // End of the end date in UTC
    const until = new Date(task.recurrence_end_date + 'T23:59:59Z');
    parts.push(`UNTIL=${toICalDateTime(localISODate(until))}`);
  }

  return `RRULE:${parts.join(';')}`;
}

// ── VEVENT builder ────────────────────────────────────────────────────────────

/**
 * Builds a VEVENT block for a single task.
 * The calendar event starts at reminder_at and lasts 15 minutes.
 * A VALARM fires at event start (TRIGGER:PT0M).
 */
function buildVEvent(task: TaskRow, now: string): string {
  if (!task.reminder_at) return '';

  const dtStart = toICalDateTime(localISODateFromDateString(task.reminder_at));
  const dtEnd   = toICalDateTime(
    localISODate(new Date(task.reminder_at) + 15 * 60_000)
  );
  const dtstamp = toICalDateTime(now);
  const uid     = `task-${task.id}@personal-dashboard`;
  const summary = escapeText(task.title);
  const desc    = task.body_md
    ? escapeText(task.body_md.slice(0, 500))  // cap description length
    : '';

  const rrule = buildRRule(task);

  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
  ];

  if (desc)  lines.push(`DESCRIPTION:${desc}`);
  if (rrule) lines.push(rrule);

  // VALARM: display alert at event start
  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`Reminder: ${task.title}`)}`,
    'END:VALARM',
  );

  lines.push('END:VEVENT');

  return lines.map(foldLine).join('\r\n');
}

// ── VCALENDAR builder ─────────────────────────────────────────────────────────

/**
 * Builds a complete VCALENDAR string for an array of tasks.
 * Only tasks with a non-null reminder_at are included.
 */
export function buildVCalendar(tasks: TaskRow[], calName = 'Task Reminders'): string {
  const now = localTodayISO();

  const events = tasks
    .filter(t => t.reminder_at != null)
    .map(t => buildVEvent(t, now))
    .filter(Boolean)
    .join('\r\n');

  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Personal Dashboard//Task Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calName)}`,
    'X-WR-CALDESC:Reminders from your Personal Dashboard',
  ].join('\r\n');

  const footer = 'END:VCALENDAR';

  return events
    ? `${header}\r\n${events}\r\n${footer}`
    : `${header}\r\n${footer}`;
}
