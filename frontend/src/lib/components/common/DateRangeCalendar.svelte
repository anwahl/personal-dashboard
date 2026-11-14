<script lang="ts">
	/**
	 * Inline calendar that picks one day or a range (toggle at the top), with
	 * Clear / Apply. Nothing is reported until Apply.
	 */
	import { parseDate, type DateValue } from '@internationalized/date';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		DatePicker,
		DatePickerDayTable,
		DatePickerMonthTable,
		DatePickerView,
		DatePickerYearTable
	} from '#lib/components/ui/date-picker/index.js';
	import { ToggleGroup, ToggleGroupItem } from '#lib/components/ui/toggle-group/index.js';
	import type { DateRange } from './filter.ts';
	import styles from './DateRangeCalendar.module.css';

	let {
		value = null,
		onApply
	}: {
		value?: DateRange | null;
		/** Called with the picked day/range, or null for Clear. */
		onApply: (range: DateRange | null) => void;
	} = $props();

	type Mode = 'single' | 'range';

	// Local working copy; seeded from `value` when the calendar opens (it's remounted each time).
	// svelte-ignore state_referenced_locally
	let mode = $state<Mode>(value && value.from !== value.to ? 'range' : 'single');
	// svelte-ignore state_referenced_locally
	let picked = $state<DateValue[]>(
		value ? (value.from === value.to ? [parseDate(value.from)] : [parseDate(value.from), parseDate(value.to)]) : []
	);

	function setMode(next: Mode) {
		if (next === mode) return;
		mode = next;
		picked = picked.slice(0, 1);
	}

	const complete = $derived(mode === 'single' ? picked.length === 1 : picked.length === 2);

	function apply() {
		if (!complete) return;
		const [a, b = a] = picked.map((d) => d.toString());
		onApply({ from: a, to: b });
	}
</script>

<div class={styles.root}>
	<ToggleGroup
		class={styles.mode}
		value={[mode]}
		onValueChange={(d) => d.value[0] && setMode(d.value[0] as Mode)}
		aria-label="Date mode"
	>
		<ToggleGroupItem value="single">Single date</ToggleGroupItem>
		<ToggleGroupItem value="range">Range</ToggleGroupItem>
	</ToggleGroup>

	{#key mode}
		<DatePicker
			inline
			selectionMode={mode}
			value={picked}
			onValueChange={(d) => (picked = d.value)}
			class={styles.picker}
		>
			<DatePickerView view="day"><DatePickerDayTable /></DatePickerView>
			<DatePickerView view="month"><DatePickerMonthTable /></DatePickerView>
			<DatePickerView view="year"><DatePickerYearTable /></DatePickerView>
		</DatePicker>
	{/key}

	<div class={styles.footer}>
		<Button variant="outline" size="sm" onclick={() => onApply(null)}>Clear</Button>
		<Button size="sm" disabled={!complete} onclick={apply}>Apply</Button>
	</div>
</div>
