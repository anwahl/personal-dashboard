<script lang="ts">
	/**
	 * One task: checkbox (K2: done ↔ to-do), priority marks (V5: `!!` High,
	 * `!` Medium) before the title, and the due/status line. Overdue shows an
	 * alert icon on the due line in the danger color; finished tasks are struck
	 * through.
	 */
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import {
		Checkbox,
		CheckboxControl,
		CheckboxHiddenInput,
		CheckboxLabel
	} from '#lib/components/ui/checkbox/index.js';
	import { dueText, isOverdue } from '#lib/tasks/dates.ts';
	import { PRIORITY_LABEL, isFinished, type Task } from '#lib/tasks/labels.ts';
	import styles from './TaskRow.module.css';

	let {
		task,
		contextDate,
		onToggle,
		onOpen
	}: {
		task: Task;
		contextDate: string;
		onToggle: (task: Task) => void;
		onOpen?: (task: Task) => void;
	} = $props();

	const finished = $derived(isFinished(task.status));
	const overdue = $derived(isOverdue(task, contextDate));
	const marks = $derived(task.priority === 'high' ? '!!' : task.priority === 'medium' ? '!' : '');
</script>

<div class={styles.row}>
	<!-- The checkbox's whole 44px cell is the tap target. -->
	<Checkbox
		class={styles.check}
		checked={task.status === 'done'}
		onCheckedChange={() => onToggle(task)}
	>
		<CheckboxControl class={styles.box} />
		<CheckboxLabel class="sr-only">
			Mark “{task.title}” {task.status === 'done' ? 'not done' : 'done'}
		</CheckboxLabel>
		<CheckboxHiddenInput />
	</Checkbox>

	<button type="button" class={styles.open} onclick={() => onOpen?.(task)}>
		<span class={[styles.title, finished && styles.finished]}>
			{#if marks && !finished}
				<span class={styles.marks} data-priority={task.priority} aria-hidden="true">{marks}</span>
				<span class="sr-only">{PRIORITY_LABEL[task.priority]} priority:</span>
			{/if}
			<span class={styles.titleText}>{task.title}</span>
		</span>
		<span class={[styles.meta, overdue && styles.overdue]}>
			{#if overdue}<TriangleAlertIcon class={styles.alert} aria-hidden="true" />{/if}
			{dueText(task, contextDate)}
		</span>
	</button>
</div>
