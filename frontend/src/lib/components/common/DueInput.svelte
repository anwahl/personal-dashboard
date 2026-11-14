<script lang="ts">
	/**
	 * Due date + time in one Ark DateInput (date and time segments together).
	 * Leaving the time segments blank means "no time" (Annie, 2026-11-12):
	 * Ark only reports a value once every segment is filled, so when focus
	 * leaves the field we read the segments ourselves and keep a date-only due.
	 * Clearing every segment clears the due date.
	 *
	 * The 📅 button opens a popover: Ark's calendar for the day, and a Time
	 * button that opens a clock dial (TimeDial) in a nested popover, with "No time".
	 *
	 * `date` is `YYYY-MM-DD`, `time` is `HH:mm`; both null when there's no due date.
	 */
	import {
		CalendarDate,
		parseDate,
		parseDateTime,
		type DateValue
	} from '@internationalized/date';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import { useDateInput } from '@ark-ui/svelte/date-input';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		DateInputControl,
		DateInputRootProvider,
		DateInputSegments
	} from '#lib/components/ui/date-input/index.js';
	import {
		DatePicker,
		DatePickerDayTable,
		DatePickerMonthTable,
		DatePickerView,
		DatePickerYearTable
	} from '#lib/components/ui/date-picker/index.js';
	import {
		Popover,
		PopoverContent,
		PopoverPositioner,
		PopoverTrigger
	} from '#lib/components/ui/popover/index.js';
	import TimeDial from './TimeDial.svelte';
	import styles from './DueInput.module.css';

	let {
		date = $bindable(null),
		time = $bindable(null),
		id,
		label = 'Due date and time',
		class: className
	}: {
		date?: string | null;
		time?: string | null;
		id?: string;
		label?: string;
		class?: string;
	} = $props();

	const pad = (n: number) => String(n).padStart(2, '0');

	let pickerOpen = $state(false);
	let dialOpen = $state(false);

	/** "9:05 PM" for the Time button. */
	const timeLabel = $derived.by(() => {
		if (!time) return 'No time';
		const [h, m] = time.split(':').map(Number);
		return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	});

	/** The field's value from date/time: a date-only value leaves the time segments blank. */
	const current = $derived<DateValue[]>(
		date ? [time ? parseDateTime(`${date}T${time}`) : parseDate(date)] : []
	);

	function setFrom(value: DateValue) {
		date = `${value.year}-${pad(value.month)}-${pad(value.day)}`;
		time = 'hour' in value ? `${pad(value.hour)}:${pad(value.minute)}` : null;
	}

	const api = useDateInput(() => ({
		id,
		granularity: 'minute',
		value: current,
		onValueChange(details) {
			// Only complete values arrive here (date and time both filled).
			if (details.value[0]) setFrom(details.value[0]);
		},
		onFocusChange(details) {
			if (!details.focused) settle();
		}
	}));

	/** On leaving the field: work out date-only / cleared from whatever segments are filled. */
	function settle() {
		const segments = api().getSegments().filter((s) => s.isEditable);
		const filled = (type: string) => segments.some((s) => s.type === type && !s.isPlaceholder);
		const get = (type: string) => segments.find((s) => s.type === type)?.value;

		const hasDate = filled('year') && filled('month') && filled('day');
		const anyDate = filled('year') || filled('month') || filled('day');
		const hasTime = filled('hour') && filled('minute');

		if (hasDate && hasTime) return; // complete; onValueChange already saved it
		if (hasDate) {
			const day = new CalendarDate(get('year')!, get('month')!, get('day')!);
			setFrom(day); // date only: time becomes null
			api().setValue([day]);
		} else if (!anyDate) {
			date = null;
			time = null;
			api().clearValue();
		} else {
			// Half a date: put back what was there.
			api().setValue(current);
		}
	}
</script>

<DateInputRootProvider value={api} class={[styles.root, className]}>
	<DateInputControl class={styles.control} aria-label={label}>
		<DateInputSegments />
		<Popover bind:open={pickerOpen} positioning={{ placement: 'bottom-end' }}>
			<PopoverTrigger>
				{#snippet asChild(props)}
					<button {...props()} type="button" class={styles.pickerButton} aria-label="Pick due date and time">
						<CalendarIcon aria-hidden="true" />
					</button>
				{/snippet}
			</PopoverTrigger>
			<PopoverPositioner>
				<PopoverContent class={styles.popover}>
					<DatePicker
						inline
						value={date ? [parseDate(date)] : []}
						onValueChange={(d) => {
							const day = d.value[0];
							if (day) date = `${day.year}-${pad(day.month)}-${pad(day.day)}`;
						}}
					>
						<DatePickerView view="day"><DatePickerDayTable /></DatePickerView>
						<DatePickerView view="month"><DatePickerMonthTable /></DatePickerView>
						<DatePickerView view="year"><DatePickerYearTable /></DatePickerView>
					</DatePicker>

					<div class={styles.timeRow}>
						<span class={styles.timeLabel}>Time</span>
						<Popover bind:open={dialOpen} positioning={{ placement: 'top', gutter: 8 }}>
							<PopoverTrigger>
								{#snippet asChild(props)}
									<Button {...props()} variant="outline" size="sm" disabled={!date}>
										<ClockIcon aria-hidden="true" />
										{timeLabel}
									</Button>
								{/snippet}
							</PopoverTrigger>
							<PopoverPositioner>
								<PopoverContent class={styles.dialPopover}>
									<TimeDial bind:value={time} />
									<div class={styles.dialFooter}>
										<Button
											variant="ghost"
											size="sm"
											onclick={() => {
												time = null;
												dialOpen = false;
											}}
										>
											No time
										</Button>
										<Button size="sm" onclick={() => (dialOpen = false)}>Done</Button>
									</div>
								</PopoverContent>
							</PopoverPositioner>
						</Popover>
					</div>

					<div class={styles.footer}>
						<Button
							variant="ghost"
							size="sm"
							disabled={!date}
							onclick={() => {
								date = null;
								time = null;
							}}
						>
							Clear due date
						</Button>
						<Button size="sm" onclick={() => (pickerOpen = false)}>Done</Button>
					</div>
				</PopoverContent>
			</PopoverPositioner>
		</Popover>
	</DateInputControl>
</DateInputRootProvider>
