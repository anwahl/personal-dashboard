<script module lang="ts">
	import type { HTMLProps, PolymorphicProps, RefAttribute } from '@ark-ui/svelte';
	import type { SidebarSide } from './context';

	export interface SidebarRootProps extends HTMLProps<'div'>, PolymorphicProps<'div'>, RefAttribute {
		/** Collapsed to the icon rail. Bindable. */
		collapsed?: boolean;
		side?: SidebarSide;
	}
</script>

<script lang="ts">
	import { Ark } from '@ark-ui/svelte/factory';
	import { clsx } from 'clsx';
	import { provideSidebarContext } from './context';
	import styles from './Sidebar.module.css';

	let {
		class: className,
		collapsed = $bindable(false),
		ref = $bindable(null),
		side = 'left',
		...props
	}: SidebarRootProps = $props();

	provideSidebarContext({
		side: () => side,
		collapsed: () => collapsed,
		setCollapsed: (next) => (collapsed = next)
	});
</script>

<Ark
	as="div"
	{...props}
	bind:ref
	class={clsx(styles.root, className)}
	data-side={side}
	data-state={collapsed ? 'collapsed' : 'expanded'}
	data-slot="sidebar-root"
/>
