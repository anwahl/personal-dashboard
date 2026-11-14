<script lang="ts" generics="T">
	/**
	 * A bordered list of rows with loading / error / empty states and a
	 * "Load More" button. Data-source agnostic: feed it from any paged query.
	 * `header` renders as the card's top edge (e.g. a toolbar).
	 */
	import type { Snippet } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import styles from './LoadMoreList.module.css';

	let {
		items,
		key,
		row,
		empty,
		header,
		loading = false,
		error = null,
		hasMore = false,
		loadingMore = false,
		onLoadMore,
		onRetry,
		label
	}: {
		items: T[];
		key: (item: T) => string | number;
		row: Snippet<[T]>;
		empty?: Snippet;
		header?: Snippet;
		loading?: boolean;
		error?: Error | null;
		hasMore?: boolean;
		loadingMore?: boolean;
		onLoadMore?: () => void;
		onRetry?: () => void;
		/** Accessible name of the list. */
		label: string;
	} = $props();
</script>

<div class={styles.card}>
	{#if header}
		<div class={styles.header}>{@render header()}</div>
	{/if}

	{#if loading}
		<div class={styles.list} aria-busy="true" aria-label={label}>
			{#each { length: 4 }, i (i)}
				<div class={styles.skeletonRow}>
					<Skeleton boxSize={22} borderRadius={6} />
					<Skeleton height={16} class={styles.grow} />
				</div>
			{/each}
		</div>
	{:else if error}
		<div class={styles.message} role="alert">
			<p>Couldn't load this list.</p>
			{#if onRetry}
				<Button variant="outline" class={styles.retry} onclick={onRetry}>Try again</Button>
			{/if}
		</div>
	{:else if items.length === 0}
		<div class={[styles.message, styles.muted]}>
			{#if empty}{@render empty()}{:else}Nothing here.{/if}
		</div>
	{:else}
		<ul class={styles.list} aria-label={label}>
			{#each items as item (key(item))}
				<li>{@render row(item)}</li>
			{/each}
		</ul>
	{/if}
</div>

{#if !loading && !error && hasMore}
	<div class={styles.more}>
		<Button variant="secondary" disabled={loadingMore} onclick={onLoadMore}>
			{loadingMore ? 'Loading…' : 'Load More'}
		</Button>
	</div>
{/if}
