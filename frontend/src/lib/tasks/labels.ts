import type { components } from '#lib/api/schema.d.ts';

export type Task = components['schemas']['Task'];
export type TaskStatus = components['schemas']['TaskStatus'];
export type TaskPriority = components['schemas']['TaskPriority'];

export const STATUS_LABEL: Record<TaskStatus, string> = {
	'to-do': 'To-Do',
	'in-progress': 'In Progress',
	done: 'Completed',
	cancelled: 'Cancelled'
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
	low: 'Low',
	medium: 'Medium',
	high: 'High'
};

/** Statuses that count as finished (not "open"). Mirrors the backend's FINISHED. */
export const FINISHED: readonly TaskStatus[] = ['done', 'cancelled'];

export const isFinished = (status: TaskStatus) => FINISHED.includes(status);
