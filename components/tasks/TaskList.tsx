'use client';

/**
 * TaskList — reusable tabbed task component.
 *
 * Used on the Hub (contextDate = today) and the Daily Entry page
 * (contextDate = that entry's date). All tabs are relative to contextDate.
 *
 * Tabs: Today (incl. overdue) | Tomorrow | Upcoming | No Date
 * Each tab has a quickadd row. Upcoming tab shows an inline date picker.
 */

import { useState, useCallback } from 'react';
import { createClient }          from '@/lib/supabase/client';
import { createTask, completeTask } from '@/lib/dal/tasks';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { TabBar }   from '@/components/ui/Controls';
import { Button }   from '@/components/ui/Button';
import type { TaskContextData } from '@/lib/dal/tasks';
import type { TaskDetail, TaskStatusRow, TaskPriorityRow } from '@/types/dal';
import type { PersonRow }       from '@/types/schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtShortDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function priorityDotClass(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('high') || n.includes('urgent') || n.includes('critical')) return 'task-item__dot--high';
  if (n.includes('low'))  return 'task-item__dot--low';
  return 'task-item__dot--medium';
}

// ── TaskItem ──────────────────────────────────────────────────────────────────

function TaskItem({
  task, contextDate, showDueDate, onComplete,
}: {
  task:        TaskDetail;
  contextDate: string;
  showDueDate?: boolean;
  onComplete:  (id: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const handleComplete = async () => {
    setBusy(true);
    try { await onComplete(task.id); }
    finally { setBusy(false); }
  };

  const isOverdue = task.due_date && task.due_date < contextDate;

  return (
    <div className="task-item">
      <button
        type="button"
        className={`task-item__check${busy ? ' task-item__check--busy' : ''}`}
        onClick={handleComplete}
        disabled={busy}
        aria-label="Complete task"
      >
        {busy ? '…' : '○'}
      </button>

      <a href={`/tasks/${task.id}`} className="task-item__body-link">
        <span className="task-item__title">{task.title}</span>
        <div className="task-item__meta">
          {showDueDate && task.due_date && (
            <span className={`task-item__due${isOverdue ? ' task-item__due--overdue' : ''}`}>
              {isOverdue ? `Overdue · ` : ''}{fmtShortDate(task.due_date)}
            </span>
          )}
          {task.person && (
            <span className="task-item__person">{task.person.person_name}</span>
          )}
        </div>
      </a>

      <span className={`task-item__dot ${priorityDotClass(task.priority.priority_name)}`}
        title={task.priority.priority_name} />
    </div>
  );
}

// ── QuickAdd row ──────────────────────────────────────────────────────────────

function QuickAdd({
  placeholder,
  defaultDueDate,
  showDatePicker,
  onAdd,
}: {
  placeholder:    string;
  defaultDueDate: string | null;
  showDatePicker?: boolean;
  onAdd: (title: string, dueDate: string | null) => Promise<void>;
}) {
  const [title,   setTitle]   = useState('');
  const [date,    setDate]    = useState(defaultDueDate ?? '');
  const [saving,  setSaving]  = useState(false);

  const submit = async () => {
    const t = title.trim();
    if (!t || saving) return;
    setSaving(true);
    try {
      await onAdd(t, showDatePicker ? (date || null) : defaultDueDate);
      setTitle('');
    } finally { setSaving(false); }
  };

  return (
    <div className="task-quickadd">
      <input
        type="text"
        className="task-quickadd__input"
        value={title}
        placeholder={placeholder}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
      />
      {showDatePicker && (
        <input
          type="date"
          className="task-quickadd__date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      )}
      <Button variant="accent" size="sm" onClick={submit} disabled={!title.trim() || saving}>
        +
      </Button>
    </div>
  );
}

// ── TaskList ──────────────────────────────────────────────────────────────────

type TabId = 'today' | 'tomorrow' | 'upcoming' | 'unscheduled';

interface Props {
  contextDate:  string;
  initialData:  TaskContextData;
  statuses:     TaskStatusRow[];
  priorities:   TaskPriorityRow[];
  people:       PersonRow[];
}

export function TaskList({ contextDate, initialData, statuses, priorities }: Props) {
  const supabase = createClient();
  const [data, setData] = useState<TaskContextData>(initialData);
  const [tab,  setTab]  = useState<TabId>('today');

  // First non-terminal status = default for new tasks
  const defaultStatus   = statuses.find(s => !s.is_terminal) ?? statuses[0];
  // Lowest-sort-order priority = default
  const defaultPriority = [...priorities].sort((a, b) => a.sort_order - b.sort_order)[0];
  // Terminal status for completing
  const doneStatus = statuses.find(s => s.is_terminal);

  const TABS: { id: TabId; label: string }[] = [
    { id: 'today',       label: `Today${data.today.length       ? ` (${data.today.length})`       : ''}` },
    { id: 'tomorrow',    label: `Tomorrow${data.tomorrow.length  ? ` (${data.tomorrow.length})`    : ''}` },
    { id: 'upcoming',    label: `Upcoming${data.upcoming.length  ? ` (${data.upcoming.length})`    : ''}` },
    { id: 'unscheduled', label: `No Date${data.unscheduled.length ? ` (${data.unscheduled.length})` : ''}` },
  ];

  const bucket = data[tab];

  const handleAdd = useCallback(async (title: string, dueDate: string | null) => {
    if (!defaultStatus || !defaultPriority) return;

    const row = await createTask(supabase, {
      title,
      status_id:    defaultStatus.id,
      priority_id:  defaultPriority.id,
      due_date:     dueDate,
      scheduled_date: null,
      person_id:    null,
      body_md:      null,
      completed_at: null,
    });

    const newTask: TaskDetail = {
      ...row,
      status:   defaultStatus,
      priority: defaultPriority,
      person:   null,
      tag_ids:  [],
    };

    setData(prev => {
      const key = dueDate === null          ? 'unscheduled'
                : dueDate === contextDate   ? 'today'
                : dueDate === addDays(contextDate, 1) ? 'tomorrow'
                : dueDate >  addDays(contextDate, 1)  ? 'upcoming'
                : 'today';  // past due → surfaces in today
      return { ...prev, [key]: [newTask, ...prev[key]] };
    });
  }, [supabase, defaultStatus, defaultPriority, contextDate]);

  const handleComplete = useCallback(async (taskId: number) => {
    if (!doneStatus) return;
    await completeTask(supabase, taskId, doneStatus.id);
    setData(prev => ({
      today:       prev.today.filter(t => t.id !== taskId),
      tomorrow:    prev.tomorrow.filter(t => t.id !== taskId),
      upcoming:    prev.upcoming.filter(t => t.id !== taskId),
      unscheduled: prev.unscheduled.filter(t => t.id !== taskId),
    }));
  }, [supabase, doneStatus]);

  const quickAddConfig: Record<TabId, { placeholder: string; dueDate: string | null; picker?: boolean }> = {
    today:       { placeholder: 'Add task for today…',    dueDate: contextDate },
    tomorrow:    { placeholder: 'Add task for tomorrow…', dueDate: addDays(contextDate, 1) },
    upcoming:    { placeholder: 'Add upcoming task…',     dueDate: null, picker: true },
    unscheduled: { placeholder: 'Add task…',              dueDate: null },
  };

  const qa = quickAddConfig[tab];

  return (
    <Card>
      <CardHeader>
        <CardTitle>✅ Tasks</CardTitle>
      </CardHeader>
      <CardBody>
        <TabBar tabs={TABS} active={tab} onChange={id => setTab(id as TabId)} />

        <div className="task-list">
          {bucket.length === 0 ? (
            <p className="empty-state">
              {tab === 'today' ? 'Nothing due today.' :
               tab === 'tomorrow' ? 'Nothing due tomorrow.' :
               tab === 'upcoming' ? 'No upcoming tasks.' :
               'No unscheduled tasks.'}
            </p>
          ) : (
            bucket.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                contextDate={contextDate}
                showDueDate={tab === 'upcoming' || (tab === 'today' && task.due_date !== contextDate)}
                onComplete={handleComplete}
              />
            ))
          )}
        </div>

        <QuickAdd
          placeholder={qa.placeholder}
          defaultDueDate={qa.dueDate}
          showDatePicker={qa.picker}
          onAdd={handleAdd}
        />
      </CardBody>
    </Card>
  );
}
