<script lang="ts">
	/** Pick a person (or nobody). Reusable wherever a record points at a person. */
	import { createQuery } from '@tanstack/svelte-query';
	import OptionSelect from '#lib/components/common/OptionSelect.svelte';
	import { peopleQuery } from '#lib/queries/people.ts';

	let {
		value = $bindable(null),
		noneLabel = 'Unassigned',
		label = 'Person',
		id,
		class: className
	}: {
		value?: number | null;
		noneLabel?: string;
		label?: string;
		id?: string;
		class?: string;
	} = $props();

	const people = createQuery(peopleQuery);
	const options = $derived((people.data ?? []).map((p) => ({ value: p.id, label: p.person_name })));
</script>

<OptionSelect {options} bind:value {noneLabel} {label} {id} class={className} />
