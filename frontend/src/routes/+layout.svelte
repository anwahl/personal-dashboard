<script lang="ts">
	import './layout.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import favicon from '#lib/assets/favicon.svg';
	import AppSidebar from '#lib/components/app/AppSidebar.svelte';
	import BottomTabBar from '#lib/components/app/BottomTabBar.svelte';
	import BackToTop from '#lib/components/common/BackToTop.svelte';
	import ConfirmDialog from '#lib/components/common/ConfirmDialog.svelte';
	import { ToastToaster } from '#lib/components/ui/toast/index.js';
	import { IsMobile } from '#lib/hooks/is-mobile.svelte.ts';
	import { toaster } from '#lib/toast.ts';
	import styles from './layout.module.css';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const mobile = new IsMobile();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Homeport</title>
</svelte:head>

<QueryClientProvider client={data.queryClient}>
	{#if mobile.current}
		<main class={styles.main}>
			{@render children()}
		</main>
		<BottomTabBar />
	{:else}
		<AppSidebar>
			<main class={styles.main}>
				{@render children()}
			</main>
		</AppSidebar>
	{/if}
	<BackToTop />
	<ToastToaster {toaster} />
	<ConfirmDialog />
</QueryClientProvider>
