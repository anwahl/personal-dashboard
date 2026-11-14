/** Types for FacetedFilter: a grouped multi-select. */

export interface FilterOption {
	value: string;
	label: string;
}

export interface FilterGroup {
	key: string;
	label: string;
	options: FilterOption[];
	/** Adds a "Custom date" choice to this group that opens a calendar (single day or range). */
	customDate?: boolean;
}

/** Selected values per group key. An empty (or missing) group doesn't filter. */
export type FilterValue = Record<string, string[]>;

export type SortDirection = 'asc' | 'desc';

/** A day (`from === to`) or an inclusive range, as `YYYY-MM-DD`. */
export interface DateRange {
	from: string;
	to: string;
}

/** "Nov 14" or "Nov 10 – 16" / "Oct 30 – Nov 2". */
export function formatRange(range: DateRange): string {
	const d = (s: string) => new Date(`${s}T00:00:00`);
	const from = d(range.from);
	const to = d(range.to);
	const md = (x: Date) => x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	if (range.from === range.to) return md(from);
	if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
		return `${md(from)} – ${to.getDate()}`;
	}
	return `${md(from)} – ${md(to)}`;
}
