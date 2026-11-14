<script lang="ts">
	/** Renders Markdown (GitHub-flavoured). Raw HTML in the source is not rendered. */
	import Markdown from 'svelte-exmarkdown';
	import { gfmPlugin } from 'svelte-exmarkdown/gfm';
	import styles from './Markdown.module.css';

	let { md, class: className }: { md: string; class?: string } = $props();

	const plugins = [gfmPlugin()];
</script>

<div class={[styles.prose, className]}>
	<Markdown {md} {plugins} />
</div>
