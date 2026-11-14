import { localTime, localToday } from '#lib/dates.ts';
import { STATUS_LABEL, isFinished, type Task } from './labels.ts';

/** `HH:mm[:ss]` → `HH:mm`, comparable as a string. */
const hhmm = (time: string) => time.slice(0, 5);

/**
 * Open and due before the context date, or due on it at a time that has
 * already passed (the time part only applies when the context date is today).
 */
export function isOverdue(task: Task, contextDate: string, now = new Date()): boolean {
	if (isFinished(task.status) || !task.due_date) return false;
	if (task.due_date < contextDate) return true;
	return (
		task.due_date === contextDate &&
		contextDate === localToday(now) &&
		!!task.due_time &&
		hhmm(task.due_time) < localTime(now)
	);
}

function formatDate(date: string, contextDate: string) {
	const d = new Date(`${date}T00:00:00`);
	const sameYear = date.slice(0, 4) === contextDate.slice(0, 4);
	return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}

function formatTime(time: string) {
	const [h, m] = hhmm(time).split(':').map(Number);
	return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function addDays(date: string, n: number) {
	const d = new Date(`${date}T00:00:00`);
	d.setDate(d.getDate() + n);
	return localToday(d);
}

/** The row's second line, e.g. "Due today · 9:00 AM", "Overdue · Oct 28", "No date", "Completed". */
export function dueText(task: Task, contextDate: string, now = new Date()): string {
	if (isFinished(task.status)) return STATUS_LABEL[task.status];
	if (!task.due_date) return 'No date';

	const isToday = contextDate === localToday(now);
	let day: string;
	if (isOverdue(task, contextDate, now)) day = 'Overdue';
	else if (task.due_date === contextDate) day = isToday ? 'Due today' : 'Due this day';
	else if (task.due_date === addDays(contextDate, 1)) day = isToday ? 'Due tomorrow' : 'Due next day';
	else day = `Due ${formatDate(task.due_date, contextDate)}`;

	const parts = [day];
	if (day === 'Overdue') parts.push(formatDate(task.due_date, contextDate));
	if (task.due_time) parts.push(formatTime(task.due_time));
	return parts.join(' · ');
}

/** Full due date for the details panel, e.g. "Thu, Oct 30, 2026 · 9:00 AM". */
export function dueFull(date: string | null, time: string | null): string {
	if (!date) return 'No due date';
	const day = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	return time ? `${day} · ${formatTime(time)}` : day;
}
