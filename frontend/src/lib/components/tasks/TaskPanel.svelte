<script lang="ts">
	/**
	 * Task Details (when `task` is set) or New Task (when it's null), in a
	 * side panel / bottom sheet. Every field is edited in place:
	 * - Title, Details: Ark Editable, entered on focus (click, tap or Tab).
	 *   Esc cancels; Enter or leaving keeps (Details: Enter is a new line,
	 *   Ctrl/⌘+Enter keeps).
	 * - Due: one date+time field. Status, Priority, Person: pick from a list.
	 * - A changed field gets a ↺ button (after you leave it) that puts back the
	 *   saved value (M2; phones and desktop).
	 * - Labels float (L2): in place while a field is empty, small above it otherwise.
	 * - Focusing never selects all the text.
	 * Edits stay in a local draft; nothing is saved until Save, which sends
	 * only the changed fields. With unsaved changes the panel only closes via
	 * ✕, which asks first.
	 */
	import { flushSync } from 'svelte';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import OptionSelect from '#lib/components/common/OptionSelect.svelte';
	import DueInput from '#lib/components/common/DueInput.svelte';
	import Markdown from '#lib/components/common/Markdown.svelte';
	import ResponsivePanel from '#lib/components/common/ResponsivePanel.svelte';
	import PersonSelect from '#lib/components/people/PersonSelect.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Editable,
		EditableArea,
		EditableInput,
		EditablePreview
	} from '#lib/components/ui/editable/index.js';
	import { Switch, SwitchControl, SwitchThumb } from '#lib/components/ui/switch/index.js';
	import { ToggleGroup, ToggleGroupItem } from '#lib/components/ui/toggle-group/index.js';
	import { confirm } from '#lib/confirm.svelte.ts';
	import { createTaskMutations, type TaskUpdate } from '#lib/queries/tasks.ts';
	import {
		PRIORITY_LABEL,
		STATUS_LABEL,
		type Task,
		type TaskPriority,
		type TaskStatus
	} from '#lib/tasks/labels.ts';
	import { toast } from '#lib/toast.ts';
	import styles from './TaskPanel.module.css';

	let { open = $bindable(false), task = null }: { open?: boolean; task?: Task | null } = $props();

	interface Draft {
		title: string;
		status: TaskStatus;
		priority: TaskPriority;
		due_date: string | null;
		due_time: string | null;
		person_id: number | null;
		body_md: string;
	}

	const fromTask = (t: Task | null): Draft => ({
		title: t?.title ?? '',
		status: t?.status ?? 'to-do',
		priority: t?.priority ?? 'low',
		due_date: t?.due_date ?? null,
		due_time: t?.due_time?.slice(0, 5) ?? null,
		person_id: t?.person?.id ?? null,
		body_md: t?.body_md ?? ''
	});

	const isNew = $derived(task === null);
	let initial = $state<Draft>(fromTask(null));
	let draft = $state<Draft>(fromTask(null));
	let editing = $state({ title: false, body: false });
	// Which field has focus, so ↺ waits until you've left it.
	let focused = $state<keyof Draft | 'due' | null>(null);

	// Every time the panel opens, start from the task as it is (nothing in edit mode).
	$effect.pre(() => {
		if (open) {
			initial = fromTask(task);
			draft = fromTask(task);
			editing = { title: false, body: false };
		}
	});

	const patch = $derived.by(() => {
		const changed: TaskUpdate = {};
		for (const key of Object.keys(draft) as (keyof Draft)[]) {
			if (draft[key] !== initial[key]) Object.assign(changed, { [key]: draft[key] });
		}
		return changed;
	});
	const dirty = $derived(Object.keys(patch).length > 0);
	const midEdit = $derived(editing.title || editing.body);

	const mutations = createTaskMutations();
	const saving = $derived(mutations.create.isPending || mutations.update.isPending);

	async function save() {
		try {
			if (task) await mutations.update.mutateAsync({ id: task.id, patch });
			else await mutations.create.mutateAsync({ ...draft, status: undefined });
			toast.success(task ? 'Task saved' : 'Task created');
			open = false;
		} catch {
			toast.error("Couldn't save the task. Your changes are still here.");
		}
	}

	async function remove() {
		if (!task) return;
		const id = task.id;
		const ok = await confirm({
			title: 'Delete this task?',
			description: "This can't be undone.",
			confirmLabel: 'Delete',
			destructive: true
		});
		if (!ok) return;
		try {
			await mutations.remove.mutateAsync(id);
			toast.success('Task deleted');
			open = false;
		} catch {
			toast.error("Couldn't delete the task.");
		}
	}

	const statusOptions = (Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }));
	const priorityOptions = (Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => ({
		value: p,
		label: PRIORITY_LABEL[p]
	}));

	/** M2: show ↺ for a changed field once it's no longer being edited (phones and desktop). */
	function showRevert(keys: (keyof Draft)[], field: typeof focused) {
		return !isNew && focused !== field && keys.some((k) => draft[k] !== initial[k]);
	}

	/**
	 * One tap to type: enter edit mode and focus the field *during* the tap.
	 * Ark focuses the input a moment later, which iOS treats as not
	 * user-initiated, so the keyboard wouldn't open until a second tap.
	 */
	function editNow(e: MouseEvent, field: 'title' | 'body') {
		if ((e.target as HTMLElement).closest('a')) return; // links in rendered Details still open
		// On iPhone, edit mode has usually started already (on touch-down), so
		// don't stop here when it has: what iOS needs is the focus() in this tap.
		if (!editing[field]) flushSync(() => (editing[field] = true));
		const input = (e.currentTarget as HTMLElement).querySelector<HTMLInputElement | HTMLTextAreaElement>(
			'input, textarea'
		);
		if (!input || document.activeElement === input) return;
		input.focus();
		input.setSelectionRange(input.value.length, input.value.length); // caret at the end, nothing selected
	}

	function revert(keys: (keyof Draft)[]) {
		for (const k of keys) Object.assign(draft, { [k]: initial[k] });
	}
</script>

{#snippet revertButton(keys: (keyof Draft)[], field: typeof focused, name: string)}
	{#if showRevert(keys, field)}
		<button type="button" class={styles.revert} aria-label="Undo changes to {name}" onclick={() => revert(keys)}>
			<RotateCcwIcon aria-hidden="true" />
		</button>
	{/if}
{/snippet}

<ResponsivePanel bind:open title={isNew ? 'New Task' : 'Task Details'} {dirty} locked={dirty || midEdit}>
	<!--
		L2 floating labels: each field's label sits where its text would be while
		the field is empty, and moves up (smaller) once it has a value or focus.
	-->
	<form
		id="task-form"
		class={styles.form}
		onsubmit={(e) => {
			e.preventDefault();
			save();
		}}
	>
		<!-- Title -->
		<div class={styles.f} data-float={editing.title || draft.title !== '' ? '' : undefined}>
			<span class={styles.label} id="task-title-label">Title</span>
			<div class={styles.row}>
				<Editable
					class={styles.field}
					bind:value={draft.title}
					bind:edit={editing.title}
					activationMode="focus"
					submitMode="both"
					selectOnFocus={false}
					onEditChange={(d) => (focused = d.edit ? 'title' : null)}
				>
					<EditableArea class={styles.area} onclick={(e: MouseEvent) => editNow(e, 'title')}>
						<EditableInput aria-labelledby="task-title-label" required />
						<EditablePreview />
					</EditableArea>
				</Editable>
				{@render revertButton(['title'], 'title', 'title')}
			</div>
		</div>

		<!-- Due: label always up, since the empty field shows mm/dd/yyyy placeholders -->
		<div class={styles.f} data-float>
			<span class={styles.label}>Due</span>
			<div class={styles.row}>
				<div
					class={styles.field}
					onfocusin={() => (focused = 'due')}
					onfocusout={() => (focused = null)}
				>
					<DueInput bind:date={draft.due_date} bind:time={draft.due_time} label="Due date and time" />
				</div>
				{@render revertButton(['due_date', 'due_time'], 'due', 'due date')}
			</div>
		</div>

		<!-- Status (details only; new tasks start as To-Do) -->
		{#if !isNew}
			<div class={styles.f} data-float>
				<span class={styles.label}>Status</span>
				<div class={styles.row}>
					<div class={styles.field}>
						<OptionSelect options={statusOptions} bind:value={draft.status} label="Status" />
					</div>
					{@render revertButton(['status'], 'status', 'status')}
				</div>
			</div>
		{/if}

		<!-- Priority -->
		<div class={styles.f} data-float>
			<span class={styles.label} id="task-priority-label">Priority</span>
			<div class={styles.row}>
				{#if isNew}
					<ToggleGroup
						class={styles.toggles}
						aria-labelledby="task-priority-label"
						value={[draft.priority]}
						onValueChange={(d) => d.value[0] && (draft.priority = d.value[0] as TaskPriority)}
					>
						{#each priorityOptions as option (option.value)}
							<ToggleGroupItem value={option.value}>{option.label}</ToggleGroupItem>
						{/each}
					</ToggleGroup>
				{:else}
					<div class={styles.field}>
						<OptionSelect options={priorityOptions} bind:value={draft.priority} label="Priority" />
					</div>
					{@render revertButton(['priority'], 'priority', 'priority')}
				{/if}
			</div>
		</div>

		<!-- Person -->
		<div class={styles.f} data-float>
			<span class={styles.label}>Person</span>
			<div class={styles.row}>
				<div class={styles.field}>
					<PersonSelect bind:value={draft.person_id} />
				</div>
				{@render revertButton(['person_id'], 'person_id', 'person')}
			</div>
		</div>

		<!-- Repeats: read-only until the recurrence redesign -->
		<div class={styles.f} data-float>
			<span class={styles.label}>Repeats</span>
			<div class={[styles.row, styles.repeats]}>
				<Switch checked={!!task?.recurrence_frequency} disabled aria-label="Repeats">
					<SwitchControl><SwitchThumb /></SwitchControl>
				</Switch>
				<span class={styles.muted}>
					{task?.recurrence_frequency ? `Repeats ${task.recurrence_frequency}` : "Doesn't repeat"}
				</span>
			</div>
		</div>

		<!-- Details: Markdown; Enter = new line, Ctrl/⌘+Enter keeps -->
		<div class={styles.f} data-float={editing.body || draft.body_md.trim() !== '' ? '' : undefined}>
			<span class={styles.label} id="task-details-label">Details</span>
			<div class={[styles.row, styles.top]}>
				<Editable
					class={styles.field}
					bind:value={draft.body_md}
					bind:edit={editing.body}
					activationMode="focus"
					submitMode="both"
					selectOnFocus={false}
					onEditChange={(d) => (focused = d.edit ? 'body_md' : null)}
				>
					<EditableArea class={[styles.area, styles.details]} onclick={(e: MouseEvent) => editNow(e, 'body')}>
						<EditableInput aria-labelledby="task-details-label">
							{#snippet asChild(props)}
								<textarea {...props()} rows="8"></textarea>
							{/snippet}
						</EditableInput>
						<EditablePreview>
							{#snippet asChild(props)}
								<div {...props()} class={[props().class, styles.preview]}>
									{#if draft.body_md.trim()}
										<Markdown md={draft.body_md} />
									{/if}
								</div>
							{/snippet}
						</EditablePreview>
					</EditableArea>
				</Editable>
				{@render revertButton(['body_md'], 'body_md', 'details')}
			</div>
		</div>
	</form>

	{#snippet footer()}
		<div class={styles.footer}>
			{#if !isNew}
				<Button variant="destructive" size="icon-lg" class={styles.delete} aria-label="Delete task" onclick={remove}>
					<Trash2Icon aria-hidden="true" />
				</Button>
			{/if}
			<Button
				type="submit"
				form="task-form"
				class={styles.save}
				disabled={saving || !draft.title.trim() || (!isNew && !dirty)}
			>
				{saving ? 'Saving…' : 'Save'}
			</Button>
		</div>
	{/snippet}
</ResponsivePanel>
