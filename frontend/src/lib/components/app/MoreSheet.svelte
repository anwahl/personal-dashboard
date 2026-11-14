<script lang="ts">
	/** Bottom sheet listing every page that isn't on the tab bar, then Settings and Log out. */
	import { page } from '$app/state';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import {
		Drawer,
		DrawerBackdrop,
		DrawerBody,
		DrawerContent,
		DrawerDescription,
		DrawerGrabber,
		DrawerGrabberIndicator,
		DrawerHeader,
		DrawerPositioner,
		DrawerTitle
	} from '#lib/components/ui/drawer/index.js';
	import { PAGES, SETTINGS, hrefOf, isActive, type NavItem } from '#lib/nav.ts';
	import styles from './MoreSheet.module.css';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const close = () => (open = false);
</script>

{#snippet item(nav: NavItem)}
	<a
		href={hrefOf(nav)}
		class={styles.tile}
		aria-current={isActive(nav, page.url.pathname) ? 'page' : undefined}
		onclick={close}
	>
		<nav.icon aria-hidden="true" />
		{nav.label}
	</a>
{/snippet}

<Drawer bind:open>
	<DrawerBackdrop />
	<DrawerPositioner>
		<DrawerContent>
			<DrawerGrabber><DrawerGrabberIndicator /></DrawerGrabber>
			<DrawerHeader>
				<DrawerTitle>More</DrawerTitle>
				<DrawerDescription class="sr-only">All other pages</DrawerDescription>
			</DrawerHeader>
			<DrawerBody>
				<div class={styles.grid}>
					{#each PAGES as nav (nav.label)}
						{@render item(nav)}
					{/each}
					{@render item(SETTINGS)}
					<a href="/auth/logout" data-sveltekit-reload class={styles.tile}>
						<LogOutIcon aria-hidden="true" />
						Log out
					</a>
				</div>
			</DrawerBody>
		</DrawerContent>
	</DrawerPositioner>
</Drawer>
