<script module lang="ts">
	import type { HTMLProps, PolymorphicProps, RefAttribute } from '@ark-ui/svelte';

	export interface SidebarPanelProps extends HTMLProps<'aside'>, PolymorphicProps<'aside'>, RefAttribute {}
</script>

<script lang="ts">
	import { Ark } from '@ark-ui/svelte/factory';
	import { clsx } from 'clsx';
	import { useSidebar } from './context';
	import styles from './Sidebar.module.css';

	let { class: className, ref = $bindable(null), ...props }: SidebarPanelProps = $props();

	const sidebar = useSidebar();
</script>

<Ark
	as="aside"
	{...props}
	bind:ref
	class={clsx(styles.panel, className)}
	data-side={sidebar.side}
	data-state={sidebar.state}
	data-slot="sidebar-panel"
/>
