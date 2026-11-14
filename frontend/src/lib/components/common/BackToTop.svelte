<script lang="ts">
	/**
	 * Back to Top (BT1): a round button, bottom-right, shown whenever the page
	 * isn't scrolled to the top. Works for the window (phones) and for the
	 * desktop layout, where the page scrolls inside `[data-page-scroll]` (AppSidebar).
	 */
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import { onMount } from 'svelte';
	import styles from './BackToTop.module.css';

	const THRESHOLD = 240;

	let scroller = $state<Element | Window | null>(null);
	let visible = $state(false);

	onMount(() => {
		function onscroll(e: Event) {
			const target = e.target;
			// Only page-level scrolling counts, not lists or popovers scrolling inside.
			const el =
				target === document || target === document.documentElement
					? window
					: target instanceof Element && target.matches('[data-page-scroll]')
						? target
						: null;
			if (!el) return;
			scroller = el;
			const top = el === window ? window.scrollY : (el as Element).scrollTop;
			visible = top > THRESHOLD;
		}
		document.addEventListener('scroll', onscroll, { capture: true, passive: true });
		return () => document.removeEventListener('scroll', onscroll, { capture: true });
	});

	function toTop() {
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		scroller?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
	}
</script>

{#if visible}
	<button type="button" class={styles.button} aria-label="Back to top" onclick={toTop}>
		<ArrowUpIcon aria-hidden="true" />
	</button>
{/if}
