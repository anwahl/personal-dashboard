'use client';

/**
 * TaskList — reusable tabbed task component.
 *
 * Used on the Hub (contextDate = today) and the Daily Entry page
 * (contextDate = that entry's date). All tabs are relative to contextDate.
 *
 * Tabs: Today (incl. overdue) | Tomorrow | Upcoming | No Date | Done
 * QuickAdd row on each tab. "Full Add" opens FullAddForm which uses
 * the shared <TaskForm> component.
 */
import { updateTaskStatus, TaskContextData,
         spawnNextRecurrence, getTaskById, 
         TasksTabId}                                    from '@/lib/dal/tasks';
import { useState, useCallback }                        from 'react';
import { useRouter }                                    from 'next/navigation';
import { createClient }                                 from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardBody,
         TabBar, Button, Chip }                         from '@/components/ui';
import type { TaskDetail, TaskStatusRow }               from '@/types/dal';
import type { PersonRow, TaskRow }                      from '@/types/schema';
import { formatShortDate, formatTime, localTodayISO }   from '@/lib/utils/dates';
import Link                                             from 'next/link';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLabel(base: string, count: number) {
  return count ? `${base} (${count})` : base;
}

function isOverdue(t: TaskDetail, contextDate: string): boolean {
  return !!t.due_date && t.due_date < contextDate && !t.status.is_terminal;
}

function isReminderOverdue(t: TaskDetail): boolean {
  if (!t.reminder_at || t.status.is_terminal) return false;
  if (t.snoozed_until && new Date(t.snoozed_until) > new Date()) return false;
  return new Date(t.reminder_at) < new Date();
}

function isReminderSoon(t: TaskDetail): boolean {
  if (!t.reminder_at || t.status.is_terminal || isReminderOverdue(t)) return false;
  return new Date(t.reminder_at) <= new Date(Date.now() + 24 * 60 * 60_000);
}

const PRIORITY_COLOR: Record<string, string> = {
  low:    'priority-dot--low',
  normal: 'priority-dot--normal',
  high:   'priority-dot--high',
};

// ── TaskItem ──────────────────────────────────────────────────────────────────

export function TaskItem({
  task,
  contextDate = localTodayISO(),
  onUpdate,
  busy
}: Readonly<{
  task:         TaskDetail;
  contextDate?: string;
  onUpdate:     (id: number) => void;
  busy:         boolean;
}>) {
  const done     = task.status.is_terminal;
  const overdue  = isOverdue(task, contextDate ?? localTodayISO());

  return (
    <Card>
      <CardBody className={`list-item${done ? ' list-item--muted' : ''}${isReminderOverdue(task) ? ' list-item--reminder-overdue' : ''}`}>
        <div className={`priority-dot ${PRIORITY_COLOR[task.priority.priority_name] ?? 'priority-dot--normal'}`} />
        <Button
          className={`task-item__check ${done ? 'task-item__is-checked' : 'task-item__is-unchecked'}${busy ? ' task-item__check--busy' : ''}`}
          onClick={() => onUpdate(task.id)}
          disabled={busy}
          size='check'
          aria-label={done ? 'Mark Not Done' : 'Mark Done'}
          title={done ? 'Mark Not Done' : 'Mark Done'}
        >
          {busy ? '…' : ''}
        </Button>

        <Link href={`/tasks/${task.id}`} className="item-body-link">
          <div className="list-item__body">
            <div className={`list-item__title${done ? ' list-item__title--strike' : ''}`}>
              {task.title}
            </div>
            <div className="list-item__meta">
              <Chip small={true} className={`${overdue ? ' chip--due' : ''}`}>
                {task.status.status_name}
              </Chip>
              {task.due_date && (
                <span className={overdue ? 'task-item__due--overdue' : 'task-item__due' }>
                  {overdue ? '⚠ ' : ''}
                  {formatShortDate(task.due_date)}
                  {task.due_time ? ' ' + formatTime(task.due_time) : ''}
                </span>
              )}
              {task.reminder_at && (
                <span className={`task-reminder-badge${
                  isReminderOverdue(task) ? ' task-reminder-badge--overdue'
                  : isReminderSoon(task)  ? ' task-reminder-badge--soon' : ''
                }`}>
                  🔔 {formatShortDate(task.reminder_at.slice(0, 10))}
                  {task.recurrence_frequency && ' ↻'}
                </span>
              )}
              {task.person && <span>{task.person.person_name}</span>}
            </div>
          </div>
        </Link>
      </CardBody>
    </Card>
  );
}

// ── TaskList ──────────────────────────────────────────────────────────────────

interface Props {
  contextDate: string;
  initialData: TaskContextData;
  statuses:    TaskStatusRow[];
  people:      PersonRow[];
}

export function TaskList({
  contextDate,
  initialData,
  statuses,
}: Readonly<Props>) {
  const supabase = createClient();
  const router = useRouter();
  const [tab,  setTab]  = useState<TasksTabId>('today');
  const [busy, setBusy] = useState(false);

  const defaultStatus = statuses.find(s => !s.is_terminal) ?? statuses[0];
  const doneStatus    = statuses.find(s => s.is_terminal);
  const doneStatusId  = doneStatus?.id ?? 0;
  const todoStatusId  = defaultStatus.id ?? 0;
  const data = initialData;

  const update = useCallback(async (id: number) => {
    const t = await getTaskById(supabase, id) ?? undefined;
    if (!t) return;
    await updateTaskStatus(supabase, id, t.status.is_terminal ? todoStatusId : doneStatusId);
    if (t.recurrence_frequency && t.reminder_at) {
      await spawnNextRecurrence(supabase, t as TaskRow, todoStatusId);
    }
    return t;
  }, [supabase, doneStatusId, todoStatusId]);

  const handleUpdate = useCallback(async (id: number) => {
    setBusy(true);
    try {
      await update(id);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }, [update, router]);

  const TABS: { id: TasksTabId; label: string }[] = [
    { id: 'today',       label: formatLabel('Today',     data.today.length)       },
    { id: 'tomorrow',    label: formatLabel('Tomorrow',  data.tomorrow.length)    },
    { id: 'upcoming',    label: formatLabel('Upcoming',  data.upcoming.length)    },
    { id: 'unscheduled', label: formatLabel('No Date',   data.unscheduled.length) },
    { id: 'done',        label: formatLabel('Done',      data.done.length)        },
  ];

  const bucket = data[tab];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardBody>
        <TabBar tabs={TABS} active={tab} onChange={id => setTab(id as TasksTabId)} />
        <div className="task-list">
          {bucket.length === 0 ? (
            <p className="empty-state">
              {tab === 'today'       ? 'Nothing due today.'      :
               tab === 'tomorrow'   ? 'Nothing due tomorrow.'   :
               tab === 'upcoming'   ? 'No upcoming tasks.'      :
               tab === 'done'       ? 'No completed tasks.'     :
               'No unscheduled tasks.'}
            </p>
          ) : (
            bucket.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                contextDate={contextDate}
                onUpdate={handleUpdate}
                busy={busy}
              />
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
}


