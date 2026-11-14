<script lang="ts">
	import TaskList from '#lib/components/tasks/TaskList.svelte';
	import { localToday } from '#lib/dates.ts';
</script>

<svelte:head><title>Tasks · Homeport</title></svelte:head>

<TaskList contextDate={localToday()} />
