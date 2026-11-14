<script lang="ts">
	import { page } from '$app/state';
	import styles from '#lib/styles/page.module.css';
</script>

<!-- Every page that hasn't been ported to the rework yet lands here. -->
<h1 class={styles.title}>Not built yet</h1>
<p class={styles.subtle}>
	<code>{page.url.pathname}</code> hasn't been ported to the new app yet.
</p>
