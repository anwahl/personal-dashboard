/** lib/dal/tasks.ts */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TaskRow, TaskStatusRow, TaskPriorityRow, PersonRow } from '@/types/schema';
import type { TaskDetail, TaskInsert, TaskUpdate } from '@/types/dal';

type Client = SupabaseClient;

async function enrich(client: Client, rows: TaskRow[]): Promise<TaskDetail[]> {
  if (rows.length === 0) return [];

  const statusIds   = [...new Set(rows.map(r => r.status_id))];
  const priorityIds = [...new Set(rows.map(r => r.priority_id))];
  const personIds   = [...new Set(rows.map(r => r.person_id).filter(Boolean) as number[])];
  const taskIds     = rows.map(r => r.id);

  const [statuses, priorities, people, tagEntries] = await Promise.all([
    client.from('task_statuses').select('*').in('id', statusIds)
      .then(r => (r.data ?? []) as TaskStatusRow[]),
    client.from('task_priorities').select('*').in('id', priorityIds)
      .then(r => (r.data ?? []) as TaskPriorityRow[]),
    personIds.length > 0
      ? client.from('people').select('*').in('id', personIds).then(r => (r.data ?? []) as PersonRow[])
      : Promise.resolve([]),
    client.from('task_tag_entries').select('task_id, tag_id').in('task_id', taskIds)
      .then(r => (r.data ?? []) as { task_id: number; tag_id: number }[]),
  ]);

  const statusMap   = new Map(statuses.map(s => [s.id, s]));
  const priorityMap = new Map(priorities.map(p => [p.id, p]));
  const personMap   = new Map(people.map(p => [p.id, p]));
  const tagMap      = tagEntries.reduce<Record<number, number[]>>((acc, te) => {
    if (!acc[te.task_id]) acc[te.task_id] = [];
    acc[te.task_id].push(te.tag_id);
    return acc;
  }, {});

  return rows.map(row => ({
    ...row,
    status:   statusMap.get(row.status_id)!,
    priority: priorityMap.get(row.priority_id)!,
    person:   row.person_id ? (personMap.get(row.person_id) ?? null) : null,
    tag_ids:  tagMap[row.id] ?? [],
  }));
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getActiveTasks(client: Client): Promise<TaskDetail[]> {
  const { data, error } = await client
    .from('tasks')
    .select('*')
    .not('status_id', 'in', `(${await getTerminalStatusIds(client)})`)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getActiveTasks: ${error.message}`);
  return enrich(client, (data ?? []) as TaskRow[]);
}

export async function getCompletedTasks(client: Client, limit = 50): Promise<TaskDetail[]> {
  const { data, error } = await client
    .from('tasks')
    .select('*')
    .in('status_id', await getTerminalStatusIds(client))
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getCompletedTasks: ${error.message}`);
  return enrich(client, (data ?? []) as TaskRow[]);
}

async function getTerminalStatusIds(client: Client): Promise<number[]> {
  const { data } = await client
    .from('task_statuses')
    .select('id')
    .eq('is_terminal', true);
  return (data ?? []).map((r: { id: number }) => r.id);
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createTask(
  client: Client,
  data: TaskInsert
): Promise<TaskRow> {
  const { data: row, error } = await client
    .from('tasks')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`createTask: ${error.message}`);
  return row as TaskRow;
}

export async function updateTask(
  client: Client,
  id:   number,
  data: TaskUpdate
): Promise<void> {
  const { error } = await client.from('tasks').update(data).eq('id', id);
  if (error) throw new Error(`updateTask: ${error.message}`);
}

export async function completeTask(client: Client, id: number, doneStatusId: number): Promise<void> {
  await updateTask(client, id, {
    status_id:    doneStatusId,
    completed_at: new Date().toISOString(),
  });
}

export async function deleteTask(client: Client, id: number): Promise<void> {
  const { error } = await client.from('tasks').delete().eq('id', id);
  if (error) throw new Error(`deleteTask: ${error.message}`);
}
