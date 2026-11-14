/**
 * Finds a date phrase inside free search text ("dentist next friday",
 * "october", "nov 10 - 16") with chrono-node, and turns it into a due-date
 * range plus the leftover text.
 */
import * as chrono from 'chrono-node';
import { localToday } from '#lib/dates.ts';
import type { DateRange } from '#lib/components/common/filter.ts';

export interface FoundDate {
	range: DateRange;
	/** The phrase as typed, and where it is in the text. */
	phrase: string;
	index: number;
	/** The text with the phrase taken out. */
	rest: string;
}

function addDays(d: Date, n: number) {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
}

export function findDate(text: string, referenceDate: string): FoundDate | null {
	const ref = new Date(`${referenceDate}T12:00:00`);
	const result = chrono.parse(text, ref)[0];
	if (!result) return null;

	const start = result.start;
	// A time alone ("3pm") isn't a date search.
	if (!start.isCertain('day') && !start.isCertain('weekday') && !start.isCertain('month')) return null;

	const day = start.date();
	let from = day;
	let to = day;

	if (result.end) {
		to = result.end.date();
	} else if (/\bweekend\b/i.test(result.text)) {
		// Saturday and Sunday of that weekend.
		from = addDays(day, -((day.getDay() + 1) % 7));
		to = addDays(from, 1);
	} else if (/\bweek\b/i.test(result.text)) {
		// The whole week (Sunday–Saturday) containing that day.
		from = addDays(day, -day.getDay());
		to = addDays(from, 6);
	} else if (start.isCertain('month') && !start.isCertain('day') && !start.isCertain('weekday')) {
		// A month on its own: the whole month.
		from = new Date(day.getFullYear(), day.getMonth(), 1);
		to = new Date(day.getFullYear(), day.getMonth() + 1, 0);
	}

	const rest = (text.slice(0, result.index) + text.slice(result.index + result.text.length)).replace(/\s+/g, ' ').trim();
	return {
		range: { from: localToday(from), to: localToday(to) },
		phrase: result.text,
		index: result.index,
		rest
	};
}
