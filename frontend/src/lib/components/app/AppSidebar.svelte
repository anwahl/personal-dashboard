<script lang="ts">
	/**
	 * Desktop layout: navigation sidebar (collapses to an icon rail with the
	 * edge button) beside the page. Phones use BottomTabBar instead.
	 * The collapsed/expanded state is remembered in this browser.
	 */
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import {
		Sidebar,
		SidebarContent,
		SidebarFooter,
		SidebarGroup,
		SidebarHeader,
		SidebarInset,
		SidebarLabel,
		SidebarNavigationButton,
		SidebarNavigationItem,
		SidebarNavigationList,
		SidebarPanel,
		SidebarTooltip,
		SidebarTrigger
	} from '#lib/components/ui/sidebar/index.js';
	import { HOME, PAGES, SETTINGS, TODAY, hrefOf, isActive, type NavItem } from '#lib/nav.ts';
	import styles from './AppSidebar.module.css';

	let { children }: { children: Snippet } = $props();

	const main = [HOME, TODAY, ...PAGES];

	// Remembered in this browser. Only the flag is saved; widths are fixed in CSS.
	const KEY = 'homeport.sidebar.collapsed';
	let collapsed = $state(read());

	function read() {
		try {
			localStorage.removeItem('homeport.sidebar.size'); // old format from the Splitter version
			return localStorage.getItem(KEY) === 'true';
		} catch {
			return false;
		}
	}

	$effect(() => {
		try {
			localStorage.setItem(KEY, String(collapsed));
		} catch {
			// Storage unavailable (private mode): not remembered.
		}
	});
</script>

{#snippet link(item: NavItem)}
	{@const active = isActive(item, page.url.pathname)}
	<SidebarNavigationItem>
		<SidebarTooltip content={item.label}>
			{#snippet children(tooltipProps)}
				<SidebarNavigationButton {...tooltipProps()} {active}>
					{#snippet asChild(buttonProps)}
						<a {...buttonProps()} href={hrefOf(item)}>
							<item.icon aria-hidden="true" />
							<SidebarLabel>{item.label}</SidebarLabel>
						</a>
					{/snippet}
				</SidebarNavigationButton>
			{/snippet}
		</SidebarTooltip>
	</SidebarNavigationItem>
{/snippet}

<Sidebar bind:collapsed class={styles.root}>
	<SidebarPanel>
		<SidebarHeader>
			<a href="/" class={styles.brand}>
				<SidebarLabel>Homeport</SidebarLabel>
			</a>
		</SidebarHeader>

		<SidebarContent>
			<SidebarGroup>
				<SidebarNavigationList>
					{#each main as item (item.label)}
						{@render link(item)}
					{/each}
				</SidebarNavigationList>
			</SidebarGroup>
		</SidebarContent>

		<SidebarFooter>
			<SidebarNavigationList>
				{@render link(SETTINGS)}
				<SidebarNavigationItem>
					<SidebarTooltip content="Log out">
						{#snippet children(tooltipProps)}
							<SidebarNavigationButton {...tooltipProps()}>
								{#snippet asChild(buttonProps)}
									<a {...buttonProps()} href="/auth/logout" data-sveltekit-reload>
										<LogOutIcon aria-hidden="true" />
										<SidebarLabel>Log out</SidebarLabel>
									</a>
								{/snippet}
							</SidebarNavigationButton>
						{/snippet}
					</SidebarTooltip>
				</SidebarNavigationItem>
			</SidebarNavigationList>
		</SidebarFooter>
	</SidebarPanel>
	<SidebarTrigger aria-label="Collapse or expand the sidebar" />
	<SidebarInset class={styles.inset}>
		<!-- Ark's splitter sets overflow: hidden on its panels inline, so the page scrolls in this wrapper. -->
		<div class={styles.scroll} data-page-scroll>
			{@render children()}
		</div>
	</SidebarInset>
</Sidebar>
