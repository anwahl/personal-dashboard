'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/client';
import { Button }                from '@/components/ui/Button';
import { TabBar }                from '@/components/ui/Controls';
import { InputField }            from '@/components/ui/Display';
import type { TaskDetail }       from '@/types/dal';
import type { TaskStatusRow, TaskPriorityRow, PersonRow } from '@/types/schema';

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
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtDate(d: string | null) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(t: TaskDetail): boolean {
  const ref = t.due_date ?? t.scheduled_date;
  return !!ref && ref < new Date().toISOString().slice(0, 10) && !t.status.is_terminal;
}

// ── Task item ─────────────────────────────────────────────────────────────────

function TaskItem({ task, doneStatusId, onComplete, onEdit }: {
  task: TaskDetail; doneStatusId: number;
  onComplete: (id: number) => void; onEdit: (t: TaskDetail) => void;
}) {
  const done    = task.status.is_terminal;
  const overdue = isOverdue(task);
  const dueDate = task.due_date ?? task.scheduled_date;

  return (
    <div className={`list-item${done ? ' list-item--muted' : ''}`}>
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
              {overdue ? '⚠ ' : ''}{fmtDate(dueDate)}
            </span>
          )}
          {task.person && <span>{task.person.person_name}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Edit panel (inline) ───────────────────────────────────────────────────────

interface EditState {
  title: string; status_id: string; priority_id: string;
  due_date: string; scheduled_date: string; person_id: string; body_md: string;
}

function taskToEdit(t: TaskDetail): EditState {
  return {
    title:          t.title,
    status_id:      String(t.status_id),
    priority_id:    String(t.priority_id),
    due_date:       t.due_date       ?? '',
    scheduled_date: t.scheduled_date ?? '',
    person_id:      t.person_id      ? String(t.person_id) : '',
    body_md:        t.body_md        ?? '',
  };
}

function EditPanel({ task, statuses, priorities, people, onSave, onDelete, onCancel, saving }: {
  task: TaskDetail; statuses: TaskStatusRow[]; priorities: TaskPriorityRow[]; people: PersonRow[];
  onSave: (d: EditState) => void; onDelete: () => void; onCancel: () => void; saving: boolean;
}) {
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
      <div style={{ display: 'flex', gap: 8 }}>
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

function FullAddForm({ statuses, priorities, people, todoStatusId, normalPriorityId, onSave, onCancel, saving }: {
  statuses: TaskStatusRow[]; priorities: TaskPriorityRow[]; people: PersonRow[];
  todoStatusId: number; normalPriorityId: number;
  onSave: (d: EditState) => void; onCancel: () => void; saving: boolean;
}) {
  const [form, setForm] = useState<EditState>({
    title: '', status_id: String(todoStatusId), priority_id: String(normalPriorityId),
    due_date: '', scheduled_date: '', person_id: '', body_md: '',
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
        <InputField label="Scheduled" id="fa-sched">
          <input id="fa-sched" type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
        </InputField>
      </div>
      <InputField label="Notes" id="fa-body">
        <textarea id="fa-body" value={form.body_md} onChange={e => set('body_md', e.target.value)} style={{ minHeight: 60 }} />
      </InputField>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="accent" onClick={() => onSave(form)} disabled={saving || !form.title.trim()}>
          {saving ? 'Adding…' : 'Add Task'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TasksClient({ active, completed, statuses, priorities, people }: Props) {
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
      await supabase.from('tasks').insert({
        title: newTitle.trim(), status_id: todoStatusId, priority_id: normalPriorityId,
        due_date: newDue || null,
        person_id: newPerson ? parseInt(newPerson) : null,
      });
      setNewTitle(''); setNewDue('');
      router.refresh();
    } finally { setAdding(false); }
  }, [supabase, newTitle, newDue, newPerson, todoStatusId, normalPriorityId, router]);

  const fullAdd = useCallback(async (data: EditState) => {
    setSaving(true);
    try {
      await supabase.from('tasks').insert({
        title:          data.title.trim(),
        status_id:      parseInt(data.status_id),
        priority_id:    parseInt(data.priority_id),
        due_date:       data.due_date       || null,
        scheduled_date: data.scheduled_date || null,
        person_id:      data.person_id      ? parseInt(data.person_id) : null,
        body_md:        data.body_md        || null,
      });
      setShowFull(false);
      router.refresh();
    } finally { setSaving(false); }
  }, [supabase, router]);

  const complete = useCallback(async (id: number) => {
    await supabase.from('tasks').update({ status_id: doneStatusId, completed_at: new Date().toISOString() }).eq('id', id);
    router.refresh();
  }, [supabase, doneStatusId, router]);

  const saveEdit = useCallback(async (data: EditState) => {
    if (!editTask) return;
    setSaving(true);
    try {
      await supabase.from('tasks').update({
        title:          data.title,
        status_id:      parseInt(data.status_id),
        priority_id:    parseInt(data.priority_id),
        due_date:       data.due_date       || null,
        scheduled_date: data.scheduled_date || null,
        person_id:      data.person_id      ? parseInt(data.person_id) : null,
        body_md:        data.body_md        || null,
      }).eq('id', editTask.id);
      setEditTask(null);
      router.refresh();
    } finally { setSaving(false); }
  }, [supabase, editTask, router]);

  const deleteTask = useCallback(async () => {
    if (!editTask || !confirm('Delete this task?')) return;
    setSaving(true);
    try {
      await supabase.from('tasks').delete().eq('id', editTask.id);
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
                  onSave={saveEdit} onDelete={deleteTask} onCancel={() => setEditTask(null)} saving={saving}
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
