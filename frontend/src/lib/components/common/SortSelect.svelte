<script lang="ts" generics="V extends string">
	/** Sort picker (S1): a select for the field plus an ↑/↓ button for the direction. */
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import { createListCollection } from '@ark-ui/svelte/select';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Select,
		SelectContent,
		SelectField,
		SelectHiddenSelect,
		SelectList,
		SelectOption,
		SelectPositioner
	} from '#lib/components/ui/select/index.js';
	import type { SortDirection } from './filter.ts';
	import styles from './SortSelect.module.css';

	let {
		options,
		value = $bindable(),
		direction = $bindable(),
		class: className
	}: {
		/** `dir` is the natural direction of that sort (e.g. newest-first for "Recently created"). */
		options: { value: V; label: string; dir: SortDirection }[];
		value: V;
		direction: SortDirection;
		class?: string;
	} = $props();

	const collection = $derived(createListCollection({ items: options }));

	// Picking another field starts it in that field's natural direction.
	function pick(next: V) {
		if (next === value) return;
		value = next;
		direction = options.find((o) => o.value === next)?.dir ?? 'asc';
	}
</script>

<div class={[styles.root, className]}>
	<Select
		{collection}
		value={[value]}
		onValueChange={(d) => d.value[0] && pick(d.value[0] as V)}
		class={styles.select}
		positioning={{ sameWidth: true }}
	>
		<SelectField aria-label="Sort by" />
		<SelectPositioner>
			<SelectContent>
				<SelectList>
					{#each collection.items as item (item.value)}
						<SelectOption {item}>{item.label}</SelectOption>
					{/each}
				</SelectList>
			</SelectContent>
		</SelectPositioner>
		<SelectHiddenSelect />
	</Select>
	<Button
		variant="outline"
		size="icon-md"
		class={styles.dir}
		aria-label={direction === 'asc' ? 'Ascending (switch to descending)' : 'Descending (switch to ascending)'}
		onclick={() => (direction = direction === 'asc' ? 'desc' : 'asc')}
	>
		{#if direction === 'asc'}<ArrowUpIcon aria-hidden="true" />{:else}<ArrowDownIcon aria-hidden="true" />{/if}
	</Button>
</div>
