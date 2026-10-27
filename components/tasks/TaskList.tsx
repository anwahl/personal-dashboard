'use client';

/**
 * TaskList — reusable tabbed task component.
 *
 * Used on the Hub (contextDate = today) and the Daily Entry page
 * (contextDate = that entry's date). All tabs are relative to contextDate.
 *
 * Tabs: Today (incl. overdue) | Tomorrow | Upcoming | No Date | Done
 * Adding: the ＋ in the header (cards on the Hub / Daily page), or a
 * "+ New Task" bottom bar (addPlacement="page", the Tasks page). Both open
 * TaskDialog, due on the open tab's day (none on No Date).
 */
import { updateTaskStatus, TaskContextData,
         spawnNextRecurrence, getTaskById, 
         TasksTabId}                                    from '@/lib/dal/tasks';
import { useState, useCallback, useEffect }                        from 'react';
import { useRouter }                                    from 'next/navigation';
import { createClient }                                 from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardBody,
         TabBar, Button, Chip, 
         useToast, EmptyState, ListItem, AddButton, CardActions, FieldActions
}                                      from '@/components/ui';
import type { TaskDetail }                              from '@/types/dal';
import type { TaskRow }                                 from '@/types/schema';
import { addDays, formatShortDate, formatTime, localTodayISO } from '@/lib/utils/dates';
import { useTaskDefaults, useTaskStatuses }             from '@/lib/hooks/reference';
import { TaskDialog }                                   from './TaskForm';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLabel(base: string, count: number) {
  return count ? `${base} (${count})` : base;
} //TODO this can go in the Strings util file or something

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
      <CardBody className={isReminderOverdue(task) ? 'list-item--reminder-overdue' : undefined}>
        <ListItem
          muted={done}
          strike={done}
          href={`/tasks/${task.id}`}
          leading={
            <>
              <div className={`priority-dot ${PRIORITY_COLOR[task.priority.priority_name] ?? 'priority-dot--normal'}`} />
              <Button
                className={`task-item__check ${done ? 'task-item__is-checked' : 'task-item__is-unchecked'}`}
                onClick={() => onUpdate(task.id)}
                busy={busy}
                size='check'
                aria-label={done ? 'Mark Not Done' : 'Mark Done'}
                title={done ? 'Mark Not Done' : 'Mark Done'}
              />
            </>
          }
          title={task.title}
          meta={
            <>
              <Chip small={true} className={`${overdue ? ' chip--overdue' : ''}`}>
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
            </>
          }
        />
      </CardBody>
    </Card>
  );
}

// ── TaskList ──────────────────────────────────────────────────────────────────

interface Props {
  contextDate: string;
  initialData: TaskContextData;
  /** Where the add button goes: the card header (default) or the page's bottom bar. */
  addPlacement?: 'card' | 'page';
}

export function TaskList({
  contextDate,
  initialData,
  addPlacement = 'card',
}: Readonly<Props>) {
  const supabase = createClient();
  const router = useRouter();
  const [tab,  setTab]  = useState<TasksTabId>('today');
  const [busy, setBusy] = useState(false);

  const { data: statuses = [], isLoading: statusesLoading, error: statusesError } = useTaskStatuses();
  const { addToast } = useToast();
  useEffect(() => {
    if (statusesError)      addToast('Failed to load task statuses', 'error'); },   [statusesError,       addToast]);
  const defaultStatus = statuses.find(s => !s.is_terminal) ?? statuses[0];
  const doneStatus    = statuses.find(s => s.is_terminal);
  const doneStatusId  = doneStatus?.id ?? 0;
  const todoStatusId  = defaultStatus?.id ?? 0;
  const { priorityId: normalPriorityId } = useTaskDefaults();
  const data = initialData;

  //TODO Update here or in TaskItem?
  const update = useCallback(async (id: number) => {
    const t = await getTaskById(supabase, id) ?? undefined;
    if (!t || statusesLoading) return;
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

  const [addOpen, setAddOpen] = useState(false);
  // A new task is due on the day of the tab you're looking at.
  const newDue = tab === 'tomorrow' ? addDays(contextDate, 1)
    : tab === 'unscheduled' ? ''
    : contextDate;
  const addDialog = (
    <TaskDialog
      open={addOpen}
      onOpenChange={setAddOpen}
      defaults={{ status_id: String(todoStatusId), priority_id: String(normalPriorityId), due_date: newDue }}
      showDateShortcuts
      contextDate={contextDate}
    />
  );

  return (
    <>
    {addPlacement === 'page' && (
      <FieldActions docked alignment="right">
        <Button variant="primary" onClick={() => setAddOpen(true)}>+ New Task</Button>
      </FieldActions>
    )}
    {addDialog}
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
        {addPlacement === 'card' && (
          <CardActions>
            <AddButton label="Add task" onClick={() => setAddOpen(true)} />
          </CardActions>
        )}
      </CardHeader>
      <CardBody>
        <TabBar label="Task lists" tabs={TABS} active={tab} onChange={id => setTab(id as TasksTabId)} />
        <div className="task-list">
          {bucket.length === 0 ? (
            <EmptyState>
              {tab === 'today'       ? 'Nothing due today.'      :
               tab === 'tomorrow'   ? 'Nothing due tomorrow.'   :
               tab === 'upcoming'   ? 'No upcoming tasks.'      :
               tab === 'done'       ? 'No completed tasks.'     :
               'No unscheduled tasks.'}
            </EmptyState>
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
    </>
  );
}


