/** Local-calendar helpers. Dates are `YYYY-MM-DD`, times `HH:mm`, both in the browser's time zone. */

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date in the browser's time zone (not UTC). */
export function localToday(now = new Date()): string {
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The current local time of day. */
export function localTime(now = new Date()): string {
	return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
