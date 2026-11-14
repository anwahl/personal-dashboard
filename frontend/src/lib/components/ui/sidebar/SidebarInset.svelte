<script module lang="ts">
	import type { HTMLProps, PolymorphicProps, RefAttribute } from '@ark-ui/svelte';

	export interface SidebarInsetProps extends HTMLProps<'div'>, PolymorphicProps<'div'>, RefAttribute {}
</script>

<script lang="ts">
	import { Ark } from '@ark-ui/svelte/factory';
	import { clsx } from 'clsx';
	import { useSidebarConfig } from './context';
	import styles from './Sidebar.module.css';

	let { class: className, ref = $bindable(null), ...props }: SidebarInsetProps = $props();

	const { side } = useSidebarConfig();
</script>

<Ark
	as="div"
	{...props}
	bind:ref
	class={clsx(styles.inset, className)}
	data-side={side()}
	data-slot="sidebar-inset"
/>
