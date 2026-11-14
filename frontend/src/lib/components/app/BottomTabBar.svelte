<script lang="ts">
	/**
	 * Phone navigation: Home · Today · Add · Calendar · More.
	 * Fixed to the bottom, clear of the home indicator (safe-area inset).
	 */
	import { page } from '$app/state';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Button } from '#lib/components/ui/button/index.js';
	import { CALENDAR, HOME, PAGES, SETTINGS, TODAY, hrefOf, isActive, type NavItem } from '#lib/nav.ts';
	import styles from './BottomTabBar.module.css';
	import MoreSheet from './MoreSheet.svelte';

	let moreOpen = $state(false);

	const moreActive = $derived([...PAGES, SETTINGS].some((item) => isActive(item, page.url.pathname)));
</script>

{#snippet link(item: NavItem)}
	<a
		href={hrefOf(item)}
		class={styles.tab}
		aria-current={isActive(item, page.url.pathname) ? 'page' : undefined}
	>
		<item.icon aria-hidden="true" />
		{item.label}
	</a>
{/snippet}

<nav aria-label="Main" class={styles.bar}>
	{@render link(HOME)}
	{@render link(TODAY)}

	<div class={styles.add}>
		<!-- Quick add arrives with package A (Home + Daily). -->
		<Button size="icon-lg" class={styles.addButton} aria-label="Quick add (not built yet)" disabled>
			<PlusIcon aria-hidden="true" />
		</Button>
	</div>

	{@render link(CALENDAR)}

	<button
		type="button"
		class={styles.tab}
		data-active={moreActive || undefined}
		aria-haspopup="dialog"
		aria-expanded={moreOpen}
		onclick={() => (moreOpen = true)}
	>
		<LayoutGridIcon aria-hidden="true" />
		More
	</button>
</nav>

<MoreSheet bind:open={moreOpen} />
