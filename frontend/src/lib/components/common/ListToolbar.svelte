<script lang="ts">
	/**
	 * A list's filter / sort / search controls.
	 * - Phones (T3): search on top, Filter and Sort side by side under it.
	 *   Meant to sit in the list card's header.
	 * - md and up (W4): Filter, Sort and Search share the row equally; whichever
	 *   is in use (focused, or its menu open) grows to 2/3 of the row.
	 * Reset appears only when `canReset`.
	 */
	import type { Snippet } from 'svelte';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import { Button } from '#lib/components/ui/button/index.js';
	import { IsMobile } from '#lib/hooks/is-mobile.svelte.ts';
	import styles from './ListToolbar.module.css';

	let {
		filter,
		sort,
		search,
		onReset,
		canReset = false,
		label = 'List options'
	}: {
		filter?: Snippet;
		sort?: Snippet;
		search?: Snippet;
		onReset?: () => void;
		canReset?: boolean;
		label?: string;
	} = $props();

	const mobile = new IsMobile();
</script>

{#snippet reset()}
	{#if onReset && canReset}
		<Button variant="ghost" class={styles.reset} aria-label="Reset filters, sort and search" onclick={onReset}>
			<RotateCcwIcon aria-hidden="true" />
		</Button>
	{/if}
{/snippet}

<div class={mobile.current ? styles.stacked : styles.row} role="toolbar" aria-label={label}>
	{#if mobile.current}
		{#if search}<div class={styles.full}>{@render search()}</div>{/if}
		<div class={styles.pair}>
			{#if filter}<div class={styles.half}>{@render filter()}</div>{/if}
			{#if sort}<div class={styles.half}>{@render sort()}</div>{/if}
			{@render reset()}
		</div>
	{:else}
		{#if filter}<div class={styles.grow}>{@render filter()}</div>{/if}
		{#if sort}<div class={styles.grow}>{@render sort()}</div>{/if}
		{#if search}<div class={styles.grow}>{@render search()}</div>{/if}
		{@render reset()}
	{/if}
</div>
