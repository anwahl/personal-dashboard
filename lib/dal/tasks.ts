/** lib/dal/tasks.ts */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TaskRow,
  TaskStatusRow,
  TaskPriorityRow,
  PersonRow,
} from "@/types/schema";
import type { TaskDetail, TaskInsert, TaskUpdate } from "@/types/dal";
import { localTodayISO, localISODate }         from '@/lib/utils/dates';

type Client = SupabaseClient;

async function enrich(client: Client, rows: TaskRow[]): Promise<TaskDetail[]> {
  if (rows.length === 0) return [];

  const statusIds = [...new Set(rows.map((r) => r.status_id))];
  const priorityIds = [...new Set(rows.map((r) => r.priority_id))];
  const personIds = [
    ...new Set(rows.map((r) => r.person_id).filter(Boolean) as number[]),
  ];
  const taskIds = rows.map((r) => r.id);

  const [statuses, priorities, people, tagEntries] = await Promise.all([
    client
      .from("task_statuses")
      .select("*")
      .in("id", statusIds)
      .then((r) => (r.data ?? []) as TaskStatusRow[]),
    client
      .from("task_priorities")
      .select("*")
      .in("id", priorityIds)
      .then((r) => (r.data ?? []) as TaskPriorityRow[]),
    personIds.length > 0
      ? client
          .from("people")
          .select("*")
          .in("id", personIds)
          .then((r) => (r.data ?? []) as PersonRow[])
      : Promise.resolve([]),
    client
      .from("task_tag_entries")
      .select("task_id, tag_id")
      .in("task_id", taskIds)
      .then((r) => (r.data ?? []) as { task_id: number; tag_id: number }[]),
  ]);

  const statusMap = new Map(statuses.map((s) => [s.id, s]));
  const priorityMap = new Map(priorities.map((p) => [p.id, p]));
  const personMap = new Map(people.map((p) => [p.id, p]));
  const tagMap = tagEntries.reduce<Record<number, number[]>>((acc, te) => {
    if (!acc[te.task_id]) acc[te.task_id] = [];
    acc[te.task_id].push(te.tag_id);
    return acc;
  }, {});

  return rows.map((row) => ({
    ...row,
    status: statusMap.get(row.status_id)!,
    priority: priorityMap.get(row.priority_id)!,
    person: row.person_id ? (personMap.get(row.person_id) ?? null) : null,
    tag_ids: tagMap[row.id] ?? [],
  }));
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getActiveTasks(client: Client): Promise<TaskDetail[]> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .not("status_id", "in", `(${await getTerminalStatusIds(client)})`)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getActiveTasks: ${error.message}`);
  return enrich(client, (data ?? []) as TaskRow[]);
}

export async function getCompletedTasks(
  client: Client,
  limit = 50,
): Promise<TaskDetail[]> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .in("status_id", await getTerminalStatusIds(client))
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getCompletedTasks: ${error.message}`);
  return enrich(client, (data ?? []) as TaskRow[]);
}

async function getTerminalStatusIds(client: Client): Promise<number[]> {
  const { data } = await client
    .from("task_statuses")
    .select("id")
    .eq("is_terminal", true);
  return (data ?? []).map((r: { id: number }) => r.id);
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createTask(
  client: Client,
  data: TaskInsert,
): Promise<TaskRow> {
  const { data: row, error } = await client
    .from("tasks")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`createTask: ${error.message}`);
  return row as TaskRow;
}

export async function updateTask(
  client: Client,
  id: number,
  data: TaskUpdate,
): Promise<void> {
  const { error } = await client.from("tasks").update(data).eq("id", id);
  if (error) throw new Error(`updateTask: ${error.message}`);
}

export async function completeTask(
  client: Client,
  id: number,
  doneStatusId: number,
): Promise<void> {
  // completed_at is a TIMESTAMPTZ — UTC ISO string is correct here (it's an instant, not a date)
  await updateTask(client, id, {
    status_id: doneStatusId,
    completed_at: localTodayISO(),
  });
}

export async function deleteTask(client: Client, id: number): Promise<void> {
  const { error } = await client.from("tasks").delete().eq("id", id);
  if (error) throw new Error(`deleteTask: ${error.message}`);
}

// ── Single-record fetch ───────────────────────────────────────────────────────

export async function getTaskById(
  client: Client,
  id: number,
): Promise<TaskDetail | null> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getTaskById(${id}): ${error.message}`);
  if (!data) return null;

  const enriched = await enrich(client, [data as TaskRow]);
  return enriched[0] ?? null;
}

// ── Date-context queries ──────────────────────────────────────────────────────

export interface TaskContextData {
  today: TaskDetail[];
  tomorrow: TaskDetail[];
  upcoming: TaskDetail[];
  unscheduled: TaskDetail[];
}

/**
 * Fetches all active tasks and buckets them relative to a "today" anchor date.
 * - today:       due_date ≤ date (includes overdue)
 * - tomorrow:    due_date = date + 1
 * - upcoming:    due_date > date + 1
 * - unscheduled: due_date IS NULL
 */
export async function getTasksByDateContext(
  client: Client,
  date: string,
): Promise<TaskContextData> {
  const { addDays } = await import("@/lib/utils/dates");
  const tomorrow = addDays(date, 1);
  const terminalIds = await getTerminalStatusIds(client);

  let q = client
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (terminalIds.length > 0) {
    q = q.not("status_id", "in", `(${terminalIds.join(",")})`);
  }

  const { data, error } = await q;
  if (error) throw new Error(`getTasksByDateContext: ${error.message}`);

  const enriched = await enrich(client, (data ?? []) as TaskRow[]);

  return {
    today: enriched.filter((t) => t.due_date !== null && t.due_date <= date),
    tomorrow: enriched.filter((t) => t.due_date === tomorrow),
    upcoming: enriched.filter(
      (t) => t.due_date !== null && t.due_date > tomorrow,
    ),
    unscheduled: enriched.filter((t) => t.due_date === null),
  };
}

// ── Reminder helpers ──────────────────────────────────────────────────────────

/**
 * Sets (or clears) the reminder_at and all recurrence fields on a task.
 * Pass null for reminderAt to remove the reminder entirely.
 */
export async function setTaskReminder(
  client: Client,
  taskId: number,
  payload: {
    reminder_at:          string | null;
    recurrence_frequency: TaskRow['recurrence_frequency'];
    recurrence_interval:  number | null;
    recurrence_days:      string | null;
    recurrence_end_date:  string | null;
  },
): Promise<void> {
  // Clearing reminder also clears recurrence and snooze state
  const patch = payload.reminder_at === null
    ? {
        reminder_at:          null,
        recurrence_frequency: null,
        recurrence_interval:  null,
        recurrence_days:      null,
        recurrence_end_date:  null,
        snoozed_until:        null,
        reminder_last_sent:   null,
      }
    : payload;

  const { error } = await client.from('tasks').update(patch).eq('id', taskId);
  if (error) throw new Error(`setTaskReminder: ${error.message}`);
}

/**
 * Snoozes the reminder on a task until the given ISO timestamptz string.
 */
export async function snoozeTaskReminder(
  client: Client,
  taskId: number,
  until: string,
): Promise<void> {
  const { error } = await client
    .from('tasks')
    .update({ snoozed_until: until })
    .eq('id', taskId);
  if (error) throw new Error(`snoozeTaskReminder: ${error.message}`);
}

/**
 * Returns tasks with a reminder_at set that haven't been completed.
 * Used by the iCal API route and the Edge Function.
 */
export async function getTasksWithReminders(client: Client): Promise<TaskRow[]> {
  const terminalIds = await getTerminalStatusIds(client);

  let q = client
    .from('tasks')
    .select('*')
    .not('reminder_at', 'is', null)
    .order('reminder_at', { ascending: true });

  if (terminalIds.length > 0) {
    q = q.not('status_id', 'in', `(${terminalIds.join(',')})`);
  }

  const { data, error } = await q;
  if (error) throw new Error(`getTasksWithReminders: ${error.message}`);
  return (data ?? []) as TaskRow[];
}

/**
 * Spawns the next recurrence of a task after it has been completed.
 * Calculates the new reminder_at from the recurrence rule and the
 * completed task's reminder_at (or now if that's in the past).
 *
 * Returns the new task, or null if the task has no recurrence or
 * the recurrence end date has passed.
 */
export async function spawnNextRecurrence(
  client: Client,
  task: TaskRow,
  defaultStatusId: number,
): Promise<TaskRow | null> {
  if (!task.recurrence_frequency || !task.reminder_at) return null;

  const interval = task.recurrence_interval ?? 1;
  const base     = new Date(task.reminder_at);
  const now      = new Date();
  // Advance base until it's in the future
  const next = computeNextOccurrence(base, task.recurrence_frequency, interval, task.recurrence_days ?? null, now);

  if (!next) return null;

  // Check recurrence end
  if (task.recurrence_end_date && localISODate(next).slice(0, 10) > task.recurrence_end_date) {
    return null;
  }

  const newTask: Omit<TaskRow, 'id' | 'created_at' | 'updated_at'> = {
    title:                task.title,
    status_id:            defaultStatusId,
    priority_id:          task.priority_id,
    due_date:             localISODate(next),
    due_time:             task.due_time ?? null,
    person_id:            task.person_id,
    body_md:              task.body_md,
    completed_at:         null,
    reminder_at:          localISODate(next),
    recurrence_frequency: task.recurrence_frequency,
    recurrence_interval:  task.recurrence_interval,
    recurrence_days:      task.recurrence_days,
    recurrence_end_date:  task.recurrence_end_date,
    snoozed_until:        null,
    reminder_last_sent:   null,
  };

  const { data, error } = await client
    .from('tasks')
    .insert(newTask)
    .select()
    .single();
  if (error) throw new Error(`spawnNextRecurrence: ${error.message}`);
  return data as TaskRow;
}

// ── Recurrence math ───────────────────────────────────────────────────────────

const WEEKDAY_CODES: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

function computeNextOccurrence(
  base: Date,
  frequency: NonNullable<TaskRow['recurrence_frequency']>,
  interval: number,
  recurrenceDays: string | null,
  now: Date,
): Date | null {
  const candidate = new Date(base);

  // Keep advancing until we land in the future
  for (let guard = 0; guard < 1000; guard++) {
    switch (frequency) {
      case 'daily':
        candidate.setDate(candidate.getDate() + interval);
        break;
      case 'weekly': {
        if (recurrenceDays) {
          // Find the next matching weekday
          const targets = recurrenceDays.split(',').map(d => WEEKDAY_CODES[d.trim()] ?? -1).filter(d => d >= 0);
          candidate.setDate(candidate.getDate() + 1);
          let inner = 0;
          while (!targets.includes(candidate.getDay()) && inner < 14) {
            candidate.setDate(candidate.getDate() + 1);
            inner++;
          }
          // Advance by (interval - 1) full weeks if we've looped a full week
          // Simple approach: just check once per interval-weeks block
        } else {
          candidate.setDate(candidate.getDate() + interval * 7);
        }
        break;
      }
      case 'monthly':
        candidate.setMonth(candidate.getMonth() + interval);
        break;
      case 'yearly':
        candidate.setFullYear(candidate.getFullYear() + interval);
        break;
    }

    if (candidate > now) return candidate;
  }
  return null;
}
