import type { paths } from '#lib/api/schema.d.ts';
import type { DateRange, FilterGroup, FilterValue, SortDirection } from '#lib/components/common/filter.ts';
import { localTime, localToday } from '#lib/dates.ts';
import { PRIORITY_LABEL } from './labels.ts';

export type TaskListQuery = paths['/api/tasks']['get']['parameters']['query'];
export type TaskSort = NonNullable<TaskListQuery['sort']>;

export const TASK_FILTER_GROUPS: FilterGroup[] = [
	{
		key: 'date',
		label: 'Date',
		customDate: true,
		options: [
			{ value: 'today', label: 'Today' },
			{ value: 'tomorrow', label: 'Tomorrow' },
			{ value: 'next_week', label: 'Next Week' },
			{ value: 'undated', label: 'Undated' }
		]
	},
	{
		key: 'status',
		label: 'Status',
		options: [
			{ value: 'open', label: 'Open' },
			{ value: 'overdue', label: 'Overdue' },
			{ value: 'done', label: 'Completed' },
			{ value: 'cancelled', label: 'Cancelled' }
		]
	},
	{
		key: 'priority',
		label: 'Priority',
		options: (['low', 'medium', 'high'] as const).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))
	}
];

/** Open tasks only (Annie, 2026-11-12). */
export const DEFAULT_TASK_FILTER: FilterValue = { date: [], status: ['open'], priority: [] };

/** `dir` is each sort's natural direction (what ↑/↓ starts at when you pick it). */
export const TASK_SORTS: { value: TaskSort; label: string; dir: SortDirection }[] = [
	{ value: 'due', label: 'Due date', dir: 'asc' },
	{ value: 'priority', label: 'Priority', dir: 'desc' },
	{ value: 'created', label: 'Created', dir: 'desc' },
	{ value: 'title', label: 'Title', dir: 'asc' }
];

export const DEFAULT_TASK_SORT: TaskSort = 'due';
export const DEFAULT_TASK_DIR: SortDirection = 'asc';

/** Everything the list controls hold. */
export interface TaskControls {
	filter: FilterValue;
	customDate: DateRange | null;
	sort: TaskSort;
	dir: SortDirection;
	search: string;
	searchDate: DateRange | null;
}

export const defaultTaskControls = (): TaskControls => ({
	filter: structuredClone(DEFAULT_TASK_FILTER),
	customDate: null,
	sort: DEFAULT_TASK_SORT,
	dir: DEFAULT_TASK_DIR,
	search: '',
	searchDate: null
});

/** True when the controls differ from the defaults (Reset has something to do). */
export function isDefaultControls(c: TaskControls): boolean {
	const d = defaultTaskControls();
	return (
		JSON.stringify(c.filter) === JSON.stringify(d.filter) &&
		c.customDate === null &&
		c.sort === d.sort &&
		c.dir === d.dir &&
		c.search === '' &&
		c.searchDate === null
	);
}

/** The list request for the current controls. `now` is only sent when the context date is today. */
export function toTaskQuery(c: TaskControls, contextDate: string): Omit<TaskListQuery, 'offset' | 'limit'> {
	const isToday = contextDate === localToday();
	return {
		context_date: contextDate,
		...(isToday && { now: localTime() }),
		date: c.filter.date as TaskListQuery['date'],
		...(c.customDate && { custom_from: c.customDate.from, custom_to: c.customDate.to }),
		status: c.filter.status as TaskListQuery['status'],
		priority: c.filter.priority as TaskListQuery['priority'],
		sort: c.sort,
		dir: c.dir,
		...(c.search.trim() && { q: c.search.trim() }),
		...(c.searchDate && { search_from: c.searchDate.from, search_to: c.searchDate.to })
	};
}
