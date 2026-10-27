/**
 * Chart helpers: axis scales that fit a trackable's range, and colours for
 * trackables without one of their own.
 */

import type { TrackableDetail } from "@/types/dal";

/** Top of a trackable's usual scale: 1 for yes/no; a slider's range max;
 *  an aggregate's highest possible total. */
export function trackableMax(t: TrackableDetail): number {
  switch (t.track_type) {
    case "boolean":
    case "prescription":
      return 1;
    case "aggregate":
      return t.questions
        .filter(q => q.is_active)
        .reduce((sum, q) => sum + Math.max(0, ...q.options.filter(o => o.is_active).map(o => o.value)), 0);
    default:
      return Number(t.range?.range_max ?? 1);
  }
}

/** Fallback colours for trackables with no colour set. */
const PALETTE = ["#d9825b", "#5b9bd9", "#8fc46a", "#c77dd1", "#e0c04f", "#5fc4b8", "#e06c8a", "#9a8cdb"];

/** Each linked trackable's colour on a chart: its own colour, else the next
 *  palette colour no other trackable on the chart already uses. */
export function trackableColors(links: { trackable: TrackableDetail }[]): Record<number, string> {
  const taken = new Set(links.map(l => l.trackable.color_hex?.toLowerCase()).filter(Boolean));
  const free  = PALETTE.filter(c => !taken.has(c));
  let next = 0;
  return Object.fromEntries(links.map(l => [
    l.trackable.id,
    l.trackable.color_hex ?? (free.length ? free[next++ % free.length] : PALETTE[next++ % PALETTE.length]),
  ]));
}

/** A "nice" axis from 0 up to at least `max` (and every value in `values`):
 *  about five evenly spaced ticks on round numbers. */
export function niceAxis(max: number, values: number[] = []): { max: number; ticks: number[] } {
  const top = Math.max(max, ...values, 1);
  const raw = top / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 3, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag;
  const axisMax = Math.ceil(top / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= axisMax + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { max: axisMax, ticks };
}
