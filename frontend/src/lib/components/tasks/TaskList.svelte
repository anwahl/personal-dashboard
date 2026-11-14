<script lang="ts">
	/**
	 * The Tasks module: header, filter/sort/search toolbar, rows, Load More.
	 * `contextDate` is the day "Today" and "Overdue" are measured from: a
	 * Daily Journal page's date, or the real today. Rows open TaskPanel.
	 * Controls start at their defaults on every visit and never touch the URL.
	 * Phones (T3): the toolbar is the list card's header. Desktop (W4): above the list.
	 */
	import { createInfiniteQuery } from '@tanstack/svelte-query';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import FacetedFilter from '#lib/components/common/FacetedFilter.svelte';
	import ListToolbar from '#lib/components/common/ListToolbar.svelte';
	import LoadMoreList from '#lib/components/common/LoadMoreList.svelte';
	import SearchInput from '#lib/components/common/SearchInput.svelte';
	import SortSelect from '#lib/components/common/SortSelect.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { IsMobile } from '#lib/hooks/is-mobile.svelte.ts';
	import { createSetTaskStatus, tasksInfiniteQuery } from '#lib/queries/tasks.ts';
	import {
		TASK_FILTER_GROUPS,
		TASK_SORTS,
		defaultTaskControls,
		isDefaultControls,
		toTaskQuery
	} from '#lib/tasks/filters.ts';
	import type { Task } from '#lib/tasks/labels.ts';
	import TaskPanel from './TaskPanel.svelte';
	import TaskRow from './TaskRow.svelte';
	import styles from './TaskList.module.css';

	let { contextDate, title = 'Tasks' }: { contextDate: string; title?: string } = $props();

	const mobile = new IsMobile();

	// The details / new-task panel. `selected` null = New Task.
	let panelOpen = $state(false);
	let selected = $state<Task | null>(null);
	function openPanel(task: Task | null) {
		selected = task;
		panelOpen = true;
	}

	let controls = $state(defaultTaskControls());
	const reset = () => (controls = defaultTaskControls());

	const tasks = createInfiniteQuery(() => tasksInfiniteQuery(toTaskQuery(controls, contextDate)));
	const items = $derived(tasks.data?.pages.flatMap((page) => page.items) ?? []);

	const setStatus = createSetTaskStatus();
	const toggle = (task: Task) =>
		setStatus.mutate({ id: task.id, status: task.status === 'done' ? 'to-do' : 'done' });
</script>

{#snippet toolbar()}
	<ListToolbar label="Task options" onReset={reset} canReset={!isDefaultControls(controls)}>
		{#snippet filter()}
			<FacetedFilter
				groups={TASK_FILTER_GROUPS}
				bind:value={controls.filter}
				bind:customDate={controls.customDate}
			/>
		{/snippet}
		{#snippet sort()}
			<SortSelect options={TASK_SORTS} bind:value={controls.sort} bind:direction={controls.dir} />
		{/snippet}
		{#snippet search()}
			<SearchInput
				bind:value={controls.search}
				bind:date={controls.searchDate}
				referenceDate={contextDate}
				placeholder="Search tasks…"
			/>
		{/snippet}
	</ListToolbar>
{/snippet}

<section class={styles.section} aria-labelledby="task-list-title">
	<header class={styles.header}>
		<h1 id="task-list-title" class={styles.title}>{title}</h1>
		<Button onclick={() => openPanel(null)}>
			<PlusIcon aria-hidden="true" />
			New
		</Button>
	</header>

	{#if !mobile.current}
		{@render toolbar()}
	{/if}

	<LoadMoreList
		label="Tasks"
		{items}
		key={(task) => task.id}
		header={mobile.current ? toolbar : undefined}
		loading={tasks.isPending}
		error={tasks.isError ? tasks.error : null}
		hasMore={tasks.hasNextPage}
		loadingMore={tasks.isFetchingNextPage}
		onLoadMore={() => tasks.fetchNextPage()}
		onRetry={() => tasks.refetch()}
	>
		{#snippet row(task)}
			<TaskRow {task} {contextDate} onToggle={toggle} onOpen={openPanel} />
		{/snippet}
		{#snippet empty()}
			No tasks match these filters.
		{/snippet}
	</LoadMoreList>
</section>

<TaskPanel bind:open={panelOpen} task={selected} />
