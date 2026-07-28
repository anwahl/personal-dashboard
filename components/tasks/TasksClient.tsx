'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/client';
import { localTodayISO }         from '@/lib/utils/dates';
import { createTask, updateTask, completeTask, deleteTask, spawnNextRecurrence } from '@/lib/dal/tasks';
import { Button }                from '@/components/ui/Button';
import { TabBar }                from '@/components/ui/Controls';
import { InputField }            from '@/components/ui/Display';
import type { TaskDetail }       from '@/types/dal';
import type { TaskStatusRow, TaskPriorityRow, PersonRow, TaskRow } from '@/types/schema';

interface Props {
  active:     TaskDetail[];
  completed:  TaskDetail[];
  statuses:   TaskStatusRow[];
  priorities: TaskPriorityRow[];
  people:     PersonRow[];
}

type TabId = 'active' | 'done';

const PRIORITY_COLOR: Record<string, string> = {
  low:    'priority-dot--low',
  normal: 'priority-dot--normal',
  high:   'priority-dot--high',
};

function addDays(n: number): string {
  const [y, m, d] = localTodayISO().split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function fmtDate(d: string | null) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(t: TaskDetail): boolean {
  const ref = t.due_date;
  return !!ref && ref < new Date().toISOString().slice(0, 10) && !t.status.is_terminal;
}

// ── Task item ─────────────────────────────────────────────────────────────────

function TaskItem({ task, doneStatusId, onComplete, onEdit }: Readonly<{
  task: TaskDetail; doneStatusId: number;
  onComplete: (id: number) => void; onEdit: (t: TaskDetail) => void;
}>) {
  const done    = task.status.is_terminal;
  const overdue = isOverdue(task);
  const dueDate = task.due_date;

  return (
    <div className={`list-item${done ? ' list-item--muted' : ''}${isReminderOverdue(task) ? ' list-item--reminder-overdue' : ''}`}>
      <div className={`priority-dot ${PRIORITY_COLOR[task.priority.priority_name] ?? 'priority-dot--normal'}`} />

      {!done && (
        <button
          type="button"
          onClick={() => onComplete(task.id)}
          style={{
            width: 22, height: 22, borderRadius: '50%',
            border: '2px solid var(--border)', background: 'transparent',
            cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
          }}
          title="Mark done"
        />
      )}

      <div className="list-item__body" onClick={() => onEdit(task)}>
        <div className={`list-item__title${done ? ' list-item__title--strike' : ''}`}>
          {task.title}
        </div>
        <div className="list-item__meta">
          <span className={`badge${overdue ? ' badge--danger' : ''}`}>{task.status.status_name}</span>
          {dueDate && (
            <span style={{ color: overdue ? 'var(--danger)' : 'var(--text-faint)' }}>
  {overdue ? '⚠ ' : ''}{fmtDate(dueDate)}{task.due_time ? ' ' + task.due_time.slice(0,5) : ''}
            </span>
          )}
          {task.reminder_at && (
            <span className={`task-reminder-badge${isReminderOverdue(task) ? ' task-reminder-badge--overdue' : isReminderSoon(task) ? ' task-reminder-badge--soon' : ''}`}>
              🔔 {fmtDate(task.reminder_at.slice(0, 10))}
              {task.recurrence_frequency && ' ↻'}
            </span>
          )}
          {task.person && <span>{task.person.person_name}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Edit panel (inline) ───────────────────────────────────────────────────────

// ── Reminder helpers ──────────────────────────────────────────────────────────

/** ISO timestamptz → local datetime string for datetime-local input */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
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

const WEEKDAYS = [
  { code: 'MO', label: 'Mo' }, { code: 'TU', label: 'Tu' }, { code: 'WE', label: 'We' },
  { code: 'TH', label: 'Th' }, { code: 'FR', label: 'Fr' }, { code: 'SA', label: 'Sa' },
  { code: 'SU', label: 'Su' },
];

// ── Form state ────────────────────────────────────────────────────────────────

interface EditState {
  title: string; status_id: string; priority_id: string;
  due_date: string; due_time: string; person_id: string; body_md: string;
  reminder_at:          string;
  recurrence_frequency: string;
  recurrence_interval:  string;
  recurrence_days:      string;
  recurrence_end_date:  string;
}

function taskToEdit(t: TaskDetail): EditState {
  return {
    title:                t.title,
    status_id:            String(t.status_id),
    priority_id:          String(t.priority_id),
    due_date:             t.due_date             ?? '',
    due_time:             t.due_time             ?? '',
    person_id:            t.person_id            ? String(t.person_id) : '',
    body_md:              t.body_md              ?? '',
    reminder_at:          t.reminder_at          ? toLocalInput(t.reminder_at) : '',
    recurrence_frequency: t.recurrence_frequency ?? '',
    recurrence_interval:  String(t.recurrence_interval ?? 1),
    recurrence_days:      t.recurrence_days      ?? '',
    recurrence_end_date:  t.recurrence_end_date  ?? '',
  };
}

// ── ReminderSection sub-component ─────────────────────────────────────────────

function ReminderSection({ form, set }: Readonly<{ form: EditState; set: (k: keyof EditState, v: string) => void }>) {
  const hasReminder = Boolean(form.reminder_at);
  const isWeekly = form.recurrence_frequency === 'weekly';

  const toggleDay = (code: string) => {
    const days = form.recurrence_days ? form.recurrence_days.split(',').filter(Boolean) : [];
    const next = days.includes(code) ? days.filter(d => d !== code) : [...days, code];
    set('recurrence_days', next.join(','));
  };

  const activeDays = form.recurrence_days ? form.recurrence_days.split(',').filter(Boolean) : [];

  return (
    <div className="reminder-section">
      <div className="reminder-section__row">
        <span className="reminder-section__label">Reminder</span>
        <input
          type="datetime-local"
          value={form.reminder_at}
          onChange={e => {
            set('reminder_at', e.target.value);
            if (!e.target.value) {
              set('recurrence_frequency', '');
              set('recurrence_days', '');
              set('recurrence_end_date', '');
            }
          }}
        />
        {hasReminder && (
          <button type="button" className="reminder-section__toggle"
            onClick={() => { set('reminder_at', ''); set('recurrence_frequency', ''); set('recurrence_days', ''); set('recurrence_end_date', ''); }}>
            ✕ Clear
          </button>
        )}
      </div>

      {hasReminder && (
        <div className="reminder-section__fields">
          <div className="reminder-section__row">
            <span className="reminder-section__label">Repeat</span>
            <select value={form.recurrence_frequency} onChange={e => { set('recurrence_frequency', e.target.value); set('recurrence_days', ''); }}>
              <option value="">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {form.recurrence_frequency && (
            <>
              <div className="reminder-section__row">
                <span className="reminder-section__label">Every</span>
                <input type="number" min="1" max="99" className="reminder-section__interval"
                  value={form.recurrence_interval}
                  onChange={e => set('recurrence_interval', e.target.value)} />
                <span className="reminder-section__unit">
                  {form.recurrence_frequency === 'daily' ? 'day(s)' :
                   form.recurrence_frequency === 'weekly' ? 'week(s)' :
                   form.recurrence_frequency === 'monthly' ? 'month(s)' : 'year(s)'}
                </span>
              </div>

              {isWeekly && (
                <div className="reminder-section__row">
                  <span className="reminder-section__label">On</span>
                  <div className="weekday-chips">
                    {WEEKDAYS.map(({ code, label }) => (
                      <button key={code} type="button"
                        className={`weekday-chip${activeDays.includes(code) ? ' weekday-chip--active' : ''}`}
                        onClick={() => toggleDay(code)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="reminder-section__row">
                <span className="reminder-section__label">Until</span>
                <input type="date" value={form.recurrence_end_date}
                  onChange={e => set('recurrence_end_date', e.target.value)} />
                {form.recurrence_end_date && (
                  <button type="button" className="reminder-section__toggle"
                    onClick={() => set('recurrence_end_date', '')}>✕</button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EditPanel({ task, statuses, priorities, people, onSave, onDelete, onCancel, saving }: Readonly<{
  task: TaskDetail; statuses: TaskStatusRow[]; priorities: TaskPriorityRow[]; people: PersonRow[];
  onSave: (d: EditState) => void; onDelete: () => void; onCancel: () => void; saving: boolean;
}>) {
  const [form, setForm] = useState<EditState>(taskToEdit(task));
  const set = (k: keyof EditState, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 8 }}>
      <InputField label="Title" id="et-title">
        <input id="et-title" type="text" value={form.title} onChange={e => set('title', e.target.value)} />
      </InputField>
      <div className="field-grid">
        <InputField label="Status" id="et-status">
          <select id="et-status" value={form.status_id} onChange={e => set('status_id', e.target.value)}>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.status_name}</option>)}
          </select>
        </InputField>
        <InputField label="Priority" id="et-priority">
          <select id="et-priority" value={form.priority_id} onChange={e => set('priority_id', e.target.value)}>
            {priorities.map(p => <option key={p.id} value={p.id}>{p.priority_name}</option>)}
          </select>
        </InputField>
      </div>
      <div className="field-grid">
        <InputField label="Due date" id="et-due">
          <input id="et-due" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </InputField>
        <InputField label="Time" id="et-time">
          <input id="et-time" type="time" value={form.due_time} onChange={e => set('due_time', e.target.value)} />
        </InputField>
        <InputField label="For" id="et-person">
          <select id="et-person" value={form.person_id} onChange={e => set('person_id', e.target.value)}>
            <option value="">Anyone</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.person_name}</option>)}
          </select>
        </InputField>
      </div>
      <InputField label="Notes" id="et-body">
        <textarea id="et-body" value={form.body_md} onChange={e => set('body_md', e.target.value)} style={{ minHeight: 60 }} />
      </InputField>
      <ReminderSection form={form} set={set} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Button variant="accent" onClick={() => onSave(form)} disabled={saving || !form.title.trim()}>
          {saving ? 'Saving…' : 'Update'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onDelete} disabled={saving}>Delete</Button>
      </div>
    </div>
  );
}

// ── Full add form ─────────────────────────────────────────────────────────────

function FullAddForm({ statuses, priorities, people, todoStatusId, normalPriorityId, onSave, onCancel, saving }: Readonly<{
  statuses: TaskStatusRow[]; priorities: TaskPriorityRow[]; people: PersonRow[];
  todoStatusId: number; normalPriorityId: number;
  onSave: (d: EditState) => void; onCancel: () => void; saving: boolean;
}>) {
  const [form, setForm] = useState<EditState>({
    title: '', status_id: String(todoStatusId), priority_id: String(normalPriorityId),
    due_date: '', due_time: '', person_id: '', body_md: '',
    reminder_at: '', recurrence_frequency: '', recurrence_interval: '1',
    recurrence_days: '', recurrence_end_date: '',
  });
  const set = (k: keyof EditState, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16 }}>
      <p style={{ fontWeight: 700, margin: '0 0 14px' }}>Add Task</p>
      <InputField label="Title" id="fa-title">
        <input id="fa-title" type="text" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
      </InputField>
      <div className="field-grid">
        <InputField label="Priority" id="fa-priority">
          <select id="fa-priority" value={form.priority_id} onChange={e => set('priority_id', e.target.value)}>
            {priorities.map(p => <option key={p.id} value={p.id}>{p.priority_name}</option>)}
          </select>
        </InputField>
        <InputField label="For" id="fa-person">
          <select id="fa-person" value={form.person_id} onChange={e => set('person_id', e.target.value)}>
            <option value="">Anyone</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.person_name}</option>)}
          </select>
        </InputField>
      </div>
      <div className="field-grid">
        <InputField label="Due date" id="fa-due">
          <input id="fa-due" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </InputField>
        <InputField label="Time" id="fa-time">
          <input id="fa-time" type="time" value={form.due_time} onChange={e => set('due_time', e.target.value)} />
        </InputField>
      </div>
      <InputField label="Notes" id="fa-body">
        <textarea id="fa-body" value={form.body_md} onChange={e => set('body_md', e.target.value)} style={{ minHeight: 60 }} />
      </InputField>
      <ReminderSection form={form} set={set} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Button variant="accent" onClick={() => onSave(form)} disabled={saving || !form.title.trim()}>
          {saving ? 'Adding…' : 'Add Task'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TasksClient({ active, completed, statuses, priorities, people }: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [localActive,    setLocalActive]    = useState(active);
  const [localCompleted, setLocalCompleted] = useState(completed);
  useEffect(() => { setLocalActive(active); },    [active]);
  useEffect(() => { setLocalCompleted(completed); }, [completed]);

  const [tab,        setTab]        = useState<TabId>('active');
  const [showFull,   setShowFull]   = useState(false);
  const [newTitle,   setNewTitle]   = useState('');
  const [newDue,     setNewDue]     = useState('');
  const [newTime,    setNewTime]    = useState('');
  const [newPerson,  setNewPerson]  = useState('');
  const [adding,     setAdding]     = useState(false);
  const [editTask,   setEditTask]   = useState<TaskDetail | null>(null);
  const [saving,     setSaving]     = useState(false);

  const doneStatusId     = statuses.find(s => s.status_name === 'done')?.id     ?? statuses.find(s => s.is_terminal)?.id ?? 0;
  const todoStatusId     = statuses.find(s => s.status_name === 'todo')?.id     ?? statuses.find(s => !s.is_terminal)?.id ?? 0;
  const normalPriorityId = priorities.find(p => p.priority_name === 'normal')?.id ?? priorities[0]?.id ?? 0;

  const quickAdd = useCallback(async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await createTask(supabase, {
        title:          newTitle.trim(),
        status_id:      todoStatusId,
        priority_id:    normalPriorityId,
        due_date:       newDue  || null,
        due_time:       newTime || null,
        person_id:      newPerson ? Number.parseInt(newPerson) : null,
        body_md:        null,
        completed_at:   null,
      });
      setNewTitle(''); setNewDue(''); setNewTime('');
      router.refresh();
    } finally { setAdding(false); }
  }, [supabase, newTitle, newDue, newTime, newPerson, todoStatusId, normalPriorityId, router]);

  const fullAdd = useCallback(async (data: EditState) => {
    setSaving(true);
    try {
    const reminderPayload = data.reminder_at ? {
      reminder_at:          new Date(data.reminder_at).toISOString(),
      recurrence_frequency: (data.recurrence_frequency || null) as TaskRow['recurrence_frequency'],
      recurrence_interval:  data.recurrence_interval ? Number.parseInt(data.recurrence_interval) : null,
      recurrence_days:      data.recurrence_days      || null,
      recurrence_end_date:  data.recurrence_end_date  || null,
    } : {
      reminder_at: null, recurrence_frequency: null, recurrence_interval: null,
      recurrence_days: null, recurrence_end_date: null,
    };
      await createTask(supabase, {
        title:          data.title.trim(),
        status_id:      Number.parseInt(data.status_id),
        priority_id:    Number.parseInt(data.priority_id),
        due_date:       data.due_date       || null,
        due_time:       data.due_time       || null,
        person_id:      data.person_id      ? Number.parseInt(data.person_id) : null,
        body_md:        data.body_md        || null,
        completed_at:   null,
        ...reminderPayload,
      });
      setShowFull(false);
      router.refresh();
    } finally { setSaving(false); }
  }, [supabase, router]);

  const complete = useCallback(async (id: number) => {
    const task = localActive.find(t => t.id === id) ?? null;
    await completeTask(supabase, id, doneStatusId);
    // Spawn next occurrence for recurring tasks
    if (task?.recurrence_frequency && task.reminder_at) {
      await spawnNextRecurrence(supabase, task as TaskRow, todoStatusId);
    }
    router.refresh();
  }, [supabase, doneStatusId, todoStatusId, localActive, router]);

  const saveEdit = useCallback(async (data: EditState) => {
    if (!editTask) return;
    setSaving(true);
    try {
    const reminderPayload = data.reminder_at ? {
      reminder_at:          new Date(data.reminder_at).toISOString(),
      recurrence_frequency: (data.recurrence_frequency || null) as TaskRow['recurrence_frequency'],
      recurrence_interval:  data.recurrence_interval ? Number.parseInt(data.recurrence_interval) : null,
      recurrence_days:      data.recurrence_days      || null,
      recurrence_end_date:  data.recurrence_end_date  || null,
    } : {
      reminder_at: null, recurrence_frequency: null, recurrence_interval: null,
      recurrence_days: null, recurrence_end_date: null,
    };
      await updateTask(supabase, editTask.id, {
        title:          data.title,
        status_id:      Number.parseInt(data.status_id),
        priority_id:    Number.parseInt(data.priority_id),
        due_date:       data.due_date       || null,
        due_time:       data.due_time       || null,
        person_id:      data.person_id      ? Number.parseInt(data.person_id) : null,
        body_md:        data.body_md        || null,
        ...reminderPayload,
        snoozed_until:  null,
        reminder_last_sent: null,
      });
      setEditTask(null);
      router.refresh();
    } finally { setSaving(false); }
  }, [supabase, editTask, router]);

  const handleDeleteTask = useCallback(async () => {
    if (!editTask || !confirm('Delete this task?')) return;
    setSaving(true);
    try {
      await deleteTask(supabase, editTask.id);
      setEditTask(null);
      router.refresh();
    } finally { setSaving(false); }
  }, [supabase, editTask, router]);

  const TABS = [
    { id: 'active', label: `Active (${localActive.length})` },
    { id: 'done',   label: 'Done' },
  ] as const;

  return (
    <div>
      {showFull ? (
        <FullAddForm
          statuses={statuses} priorities={priorities} people={people}
          todoStatusId={todoStatusId} normalPriorityId={normalPriorityId}
          onSave={fullAdd} onCancel={() => setShowFull(false)} saving={saving}
        />
      ) : (
        <>
          {/* Quick add row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && quickAdd()}
              placeholder="Quick add task…"
              style={{ flex: '1 1 180px', minWidth: 120 }}
            />
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
                style={{ width: 140 }}
              />
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                style={{ width: 100 }}
              />
              {/* Date shortcuts */}
              <div className="date-shortcuts">
                <Button size="sm" variant="ghost" onClick={() => setNewDue(addDays(1))}>Tomorrow</Button>
                <Button size="sm" variant="ghost" onClick={() => setNewDue(addDays(7))}>Next week</Button>
              </div>
            </div>
            <select value={newPerson} onChange={e => setNewPerson(e.target.value)} style={{ width: 110 }}>
              <option value="">Anyone</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.person_name}</option>)}
            </select>
            <Button variant="accent" onClick={quickAdd} disabled={adding || !newTitle.trim()}>
              {adding ? '…' : '+ Quick'}
            </Button>
            <Button variant="ghost" onClick={() => setShowFull(true)}>Full Add</Button>
          </div>
        </>
      )}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'active' && (
        <>
          {localActive.length === 0 && <p className="empty-state">Nothing active — all clear! 🎉</p>}
          {localActive.map(t => (
            <div key={t.id}>
              {editTask?.id === t.id ? (
                <EditPanel
                  task={t} statuses={statuses} priorities={priorities} people={people}
                  onSave={saveEdit} onDelete={handleDeleteTask} onCancel={() => setEditTask(null)} saving={saving}
                />
              ) : (
                <TaskItem task={t} doneStatusId={doneStatusId} onComplete={complete} onEdit={setEditTask} />
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'done' && (
        <>
          {localCompleted.length === 0 && <p className="empty-state">No completed tasks.</p>}
          {localCompleted.map(t => (
            <TaskItem key={t.id} task={t} doneStatusId={doneStatusId} onComplete={complete} onEdit={setEditTask} />
          ))}
        </>
      )}
    </div>
  );
}
