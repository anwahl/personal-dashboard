<script lang="ts" module>
	export interface SelectOptionItem<T> {
		value: T;
		label: string;
	}
</script>

<script lang="ts" generics="V extends string | number">
	/**
	 * Pick one option from a short list (Ark Select). Nothing to type, so phones
	 * never open the keyboard. `noneLabel` adds a first choice that sets the value to null.
	 */
	import { createListCollection } from '@ark-ui/svelte/select';
	import {
		Select,
		SelectContent,
		SelectField,
		SelectHiddenSelect,
		SelectList,
		SelectOption,
		SelectPositioner
	} from '#lib/components/ui/select/index.js';
	import styles from './OptionSelect.module.css';

	let {
		options,
		value = $bindable(),
		placeholder = 'Select…',
		noneLabel,
		label,
		id,
		class: className
	}: {
		options: SelectOptionItem<V>[];
		value?: V | null;
		placeholder?: string;
		noneLabel?: string;
		/** Accessible name of the field. */
		label: string;
		id?: string;
		class?: string;
	} = $props();

	const NONE = '__none__';

	const collection = $derived(
		createListCollection({
			items: [
				...(noneLabel ? [{ value: NONE, label: noneLabel }] : []),
				...options.map((o) => ({ value: String(o.value), label: o.label }))
			]
		})
	);

	const selectedKey = $derived(value == null ? (noneLabel ? NONE : null) : String(value));

	function pick(key: string | undefined) {
		if (key === undefined) return;
		if (key === NONE) value = null;
		else value = options.find((o) => String(o.value) === key)?.value ?? null;
	}
</script>

<Select
	{collection}
	{id}
	value={selectedKey ? [selectedKey] : []}
	onValueChange={(d) => pick(d.value[0])}
	positioning={{ sameWidth: true, flip: true }}
	class={[styles.root, className]}
>
	<SelectField aria-label={label} {placeholder} />
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
