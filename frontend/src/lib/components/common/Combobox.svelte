<script lang="ts" module>
	export interface ComboboxOption<T> {
		value: T;
		label: string;
	}
</script>

<script lang="ts" generics="V extends string | number">
	/**
	 * Pick one option from a list (Ark Combobox). Clicking anywhere on the field
	 * opens the list. With `searchable`, typing filters it on desktop; on phones
	 * the field never opens the keyboard (so the screen doesn't jump), it just
	 * shows the list. `noneLabel` adds a first choice that sets the value to null.
	 */
	import { createListCollection } from '@ark-ui/svelte/combobox';
	import {
		Combobox,
		ComboboxContent,
		ComboboxControl,
		ComboboxEmpty,
		ComboboxInput,
		ComboboxList,
		ComboboxOption as Option,
		ComboboxPositioner,
		ComboboxTrigger
	} from '#lib/components/ui/combobox/index.js';
	import { IsMobile } from '#lib/hooks/is-mobile.svelte.ts';
	import styles from './Combobox.module.css';

	let {
		options,
		value = $bindable(),
		placeholder = 'Select…',
		searchable = false,
		noneLabel,
		label,
		id,
		class: className
	}: {
		options: ComboboxOption<V>[];
		value?: V | null;
		placeholder?: string;
		searchable?: boolean;
		noneLabel?: string;
		/** Accessible name of the field. */
		label: string;
		id?: string;
		class?: string;
	} = $props();

	const NONE = '__none__';
	const mobile = new IsMobile();
	const typeable = $derived(searchable && !mobile.current);

	interface Item {
		value: string;
		label: string;
	}

	const all = $derived<Item[]>([
		...(noneLabel ? [{ value: NONE, label: noneLabel }] : []),
		...options.map((o) => ({ value: String(o.value), label: o.label }))
	]);

	let query = $state('');
	const collection = $derived(
		createListCollection({
			items: query ? all.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())) : all
		})
	);

	const selectedKey = $derived(value == null ? (noneLabel ? NONE : null) : String(value));
	const selectedLabel = $derived(all.find((i) => i.value === selectedKey)?.label ?? '');

	function pick(key: string | undefined) {
		if (key === undefined) return;
		if (key === NONE) value = null;
		else value = options.find((o) => String(o.value) === key)?.value ?? null;
	}
</script>

<Combobox
	{collection}
	value={selectedKey ? [selectedKey] : []}
	inputValue={selectedLabel}
	onValueChange={(d) => pick(d.value[0])}
	onInputValueChange={(d) => {
		// Only filter on typing; selecting an item also sets the input text.
		if (d.reason === 'input-change') query = d.inputValue;
	}}
	onOpenChange={(d) => {
		if (!d.open) query = '';
	}}
	openOnClick
	selectionBehavior="replace"
	positioning={{ sameWidth: true, flip: true }}
	class={[styles.root, className]}
>
	<ComboboxControl class={styles.control}>
		<ComboboxInput
			{id}
			aria-label={label}
			{placeholder}
			readonly={!typeable}
			inputmode={typeable ? undefined : 'none'}
			class={!typeable ? styles.readonly : undefined}
		/>
		<ComboboxTrigger aria-label="Show {label} options" />
	</ComboboxControl>
	<ComboboxPositioner>
		<ComboboxContent>
			<ComboboxList>
				<ComboboxEmpty>No matches.</ComboboxEmpty>
				{#each collection.items as item (item.value)}
					<Option {item}>{item.label}</Option>
				{/each}
			</ComboboxList>
		</ComboboxContent>
	</ComboboxPositioner>
</Combobox>
