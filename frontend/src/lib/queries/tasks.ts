import {
	createMutation,
	infiniteQueryOptions,
	useQueryClient,
	type InfiniteData
} from '@tanstack/svelte-query';
import { toast } from '#lib/toast.ts';
import type { components } from '#lib/api/schema.d.ts';
import { api, unwrap } from '#lib/api/client.ts';
import type { TaskListQuery } from '#lib/tasks/filters.ts';
import { isFinished, type Task, type TaskStatus } from '#lib/tasks/labels.ts';

type TaskList = components['schemas']['TaskList'];
export type TaskCreate = components['schemas']['TaskCreate'];
export type TaskUpdate = components['schemas']['TaskUpdate'];

export const TASK_PAGE_SIZE = 25;

export const taskKeys = {
	all: ['tasks'] as const,
	lists: ['tasks', 'list'] as const,
	list: (query: Omit<TaskListQuery, 'offset' | 'limit'>) => ['tasks', 'list', query] as const
};

/** A filtered task list, fetched 25 at a time ("Load More" = next page). */
export const tasksInfiniteQuery = (query: Omit<TaskListQuery, 'offset' | 'limit'>) =>
	infiniteQueryOptions({
		queryKey: taskKeys.list(query),
		queryFn: ({ pageParam }) =>
			unwrap(
				api.GET('/api/tasks', {
					params: { query: { ...query, offset: pageParam, limit: TASK_PAGE_SIZE } }
				})
			),
		initialPageParam: 0,
		getNextPageParam: (last, pages) => {
			const loaded = pages.reduce((n, page) => n + page.items.length, 0);
			return loaded < last.total ? loaded : undefined;
		}
	});

/** Apply `change` to the task with `id` in every cached list. */
function patchCachedLists(
	client: ReturnType<typeof useQueryClient>,
	id: number,
	change: (task: Task) => Task
) {
	client.setQueriesData<InfiniteData<TaskList>>({ queryKey: taskKeys.lists }, (data) =>
		data
			? {
					...data,
					pages: data.pages.map((page) => ({
						...page,
						items: page.items.map((task) => (task.id === id ? change(task) : task))
					}))
				}
			: data
	);
}

/**
 * Set a task's status, showing the change immediately. If the save fails the
 * lists go back to how they were and a toast says so.
 */
export function createSetTaskStatus() {
	const client = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
			unwrap(api.PATCH('/api/tasks/{id}', { params: { path: { id } }, body: { status } })),
		onMutate: async ({ id, status }) => {
			await client.cancelQueries({ queryKey: taskKeys.all });
			const snapshot = client.getQueriesData<InfiniteData<TaskList>>({ queryKey: taskKeys.lists });
			patchCachedLists(client, id, (task) => ({
				...task,
				status,
				completed_at: isFinished(status) ? (task.completed_at ?? new Date().toISOString()) : null
			}));
			return { snapshot };
		},
		onError: (_error, _vars, context) => {
			for (const [key, data] of context?.snapshot ?? []) client.setQueryData(key, data);
			toast.error("Couldn't save that change. It's been undone.");
		},
		onSettled: () => client.invalidateQueries({ queryKey: taskKeys.all })
	}));
}

/** Create, change or delete a task; every task list refetches afterwards. */
export function createTaskMutations() {
	const client = useQueryClient();
	const refresh = () => client.invalidateQueries({ queryKey: taskKeys.all });

	return {
		create: createMutation(() => ({
			mutationFn: (body: TaskCreate) => unwrap(api.POST('/api/tasks', { body })),
			onSuccess: refresh
		})),
		update: createMutation(() => ({
			mutationFn: ({ id, patch }: { id: number; patch: TaskUpdate }) =>
				unwrap(api.PATCH('/api/tasks/{id}', { params: { path: { id } }, body: patch })),
			onSuccess: refresh
		})),
		remove: createMutation(() => ({
			mutationFn: (id: number) => unwrap(api.DELETE('/api/tasks/{id}', { params: { path: { id } } })),
			onSuccess: refresh
		}))
	};
}
