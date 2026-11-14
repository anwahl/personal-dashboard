<script lang="ts">
	/**
	 * Grouped multi-select ("Date: Today · Status: Open") in a popover of
	 * checkboxes. Choices within a group are OR'd and groups are AND'd by
	 * whoever reads `value`; this component only edits it. Stays open while
	 * ticking. A group with `customDate` also offers "Custom date", which opens
	 * a calendar beside the list (single day or range).
	 */
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import FunnelIcon from '@lucide/svelte/icons/funnel';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Checkbox,
		CheckboxControl,
		CheckboxHiddenInput,
		CheckboxLabel
	} from '#lib/components/ui/checkbox/index.js';
	import {
		Popover,
		PopoverContent,
		PopoverPositioner,
		PopoverTrigger
	} from '#lib/components/ui/popover/index.js';
	import DateRangeCalendar from './DateRangeCalendar.svelte';
	import { formatRange, type DateRange, type FilterGroup, type FilterValue } from './filter.ts';
	import styles from './FacetedFilter.module.css';

	let {
		groups,
		value = $bindable({}),
		customDate = $bindable(null),
		placeholder = 'Filter…',
		class: className
	}: {
		groups: FilterGroup[];
		value?: FilterValue;
		/** The "Custom date" choice of the group with `customDate`. */
		customDate?: DateRange | null;
		placeholder?: string;
		class?: string;
	} = $props();

	let open = $state(false);
	let calendarOpen = $state(false);

	const selectedLabels = $derived([
		...groups.flatMap((g) => g.options.filter((o) => value[g.key]?.includes(o.value)).map((o) => o.label)),
		...(customDate ? [formatRange(customDate)] : [])
	]);

	function toggle(groupKey: string, option: string) {
		const current = value[groupKey] ?? [];
		value = {
			...value,
			[groupKey]: current.includes(option) ? current.filter((v) => v !== option) : [...current, option]
		};
	}
</script>

<Popover bind:open positioning={{ placement: 'bottom-start' }}>
	<PopoverTrigger>
		{#snippet asChild(props)}
			<Button {...props()} variant="outline" class={[styles.trigger, className]} aria-label="Filter">
				<FunnelIcon class={styles.icon} aria-hidden="true" />
				<span class={[styles.summary, !selectedLabels.length && styles.placeholder]}>
					{selectedLabels.length ? selectedLabels.join(', ') : placeholder}
				</span>
				<ChevronDownIcon class={styles.icon} aria-hidden="true" />
			</Button>
		{/snippet}
	</PopoverTrigger>
	<PopoverPositioner>
		<PopoverContent class={styles.content}>
			{#each groups as group (group.key)}
				<fieldset class={styles.group}>
					<legend class={styles.legend}>{group.label}</legend>
					{#each group.options as option (option.value)}
						<Checkbox
							class={styles.option}
							checked={value[group.key]?.includes(option.value) ?? false}
							onCheckedChange={() => toggle(group.key, option.value)}
						>
							<CheckboxControl />
							<CheckboxLabel>{option.label}</CheckboxLabel>
							<CheckboxHiddenInput />
						</Checkbox>
					{/each}

					{#if group.customDate}
						<Popover
							bind:open={calendarOpen}
							positioning={{ placement: 'right-start', gutter: 8 }}
						>
							<PopoverTrigger>
								{#snippet asChild(props)}
									<button {...props()} type="button" class={[styles.option, styles.custom]}>
										<span class={styles.fakeBox} data-checked={customDate ? '' : undefined} aria-hidden="true">
											{#if customDate}<CheckIcon aria-hidden="true" />{/if}
										</span>
										<span>Custom date</span>
										<span class={styles.customValue}>
											{customDate ? formatRange(customDate) : ''}
											<ChevronRightIcon class={styles.icon} aria-hidden="true" />
										</span>
									</button>
								{/snippet}
							</PopoverTrigger>
							<PopoverPositioner>
								<PopoverContent>
									<DateRangeCalendar
										value={customDate}
										onApply={(range) => {
											customDate = range;
											calendarOpen = false;
										}}
									/>
								</PopoverContent>
							</PopoverPositioner>
						</Popover>
					{/if}
				</fieldset>
			{/each}
		</PopoverContent>
	</PopoverPositioner>
</Popover>
