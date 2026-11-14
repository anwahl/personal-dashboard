<script lang="ts">
	/**
	 * A panel for details/forms: slides in from the right from md up, and is a
	 * bottom sheet on phones (one Ark Drawer, placed by screen size).
	 *
	 * Close rule (Annie, 2026-11-12): while nothing has changed, clicking
	 * outside, Esc or swiping closes it. Once `locked` (unsaved changes, or a
	 * field mid-edit), only the ✕ closes it, and ✕ asks "Discard changes?" first
	 * when there are unsaved changes (`dirty`).
	 */
	import type { Snippet } from 'svelte';
	import { CloseButton } from '#lib/components/ui/close-button/index.js';
	import {
		Drawer,
		DrawerBackdrop,
		DrawerBody,
		DrawerContent,
		DrawerDescription,
		DrawerFooter,
		DrawerGrabber,
		DrawerGrabberIndicator,
		DrawerHeader,
		DrawerPositioner,
		DrawerTitle
	} from '#lib/components/ui/drawer/index.js';
	import { confirm } from '#lib/confirm.svelte.ts';
	import { IsMobile } from '#lib/hooks/is-mobile.svelte.ts';
	import styles from './ResponsivePanel.module.css';

	let {
		open = $bindable(false),
		title,
		description,
		dirty = false,
		locked = dirty,
		children,
		footer
	}: {
		open?: boolean;
		title: string;
		/** For screen readers; not shown. */
		description?: string;
		/** Unsaved changes: ✕ asks before discarding them. */
		dirty?: boolean;
		/** Only ✕ may close (no outside click, Esc or swipe). Defaults to `dirty`. */
		locked?: boolean;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	const mobile = new IsMobile();

	async function close() {
		if (dirty) {
			const discard = await confirm({
				title: 'Discard changes?',
				description: "Your changes to this item haven't been saved.",
				confirmLabel: 'Discard',
				cancelLabel: 'Keep editing',
				destructive: true
			});
			if (!discard) return;
		}
		open = false;
	}
</script>

<Drawer
	bind:open
	swipeDirection={mobile.current ? 'down' : 'end'}
	closeOnInteractOutside={!locked}
	closeOnEscape={!locked}
>
	<DrawerBackdrop />
	<DrawerPositioner>
		<DrawerContent size="lg" class={styles.content} draggable={mobile.current && !locked}>
			{#if mobile.current && !locked}
				<DrawerGrabber><DrawerGrabberIndicator /></DrawerGrabber>
			{/if}
			<DrawerHeader>
				<DrawerTitle>{title}</DrawerTitle>
				<CloseButton aria-label="Close" onclick={close} />
				<DrawerDescription class="sr-only">{description ?? title}</DrawerDescription>
			</DrawerHeader>
			<DrawerBody class={styles.body}>{@render children()}</DrawerBody>
			{#if footer}
				<DrawerFooter class={styles.footer}>{@render footer()}</DrawerFooter>
			{/if}
		</DrawerContent>
	</DrawerPositioner>
</Drawer>
