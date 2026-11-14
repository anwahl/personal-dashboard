<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { meQuery } from '#lib/queries/me.ts';
	import page from '#lib/styles/page.module.css';

	const me = createQuery(meQuery);
</script>

<!-- Placeholder until Home is mocked up and ported (package A). -->
<h1 class={page.title}>Home</h1>
{#if me.isSuccess}
	<p class={page.subtle}>Logged in as {me.data.email}</p>
{/if}
