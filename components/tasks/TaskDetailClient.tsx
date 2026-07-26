'use client';

import { InputField, SaveStatus, SaveState } from '@/components/ui/Display';
import { useState, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/client';
import { updateTask, completeTask, deleteTask } from '@/lib/dal/tasks';
import { Button }                from '@/components/ui/Button';
import { ConfirmButton }         from '@/components/ui/ConfirmButton';
import type { TaskDetail, TaskStatusRow, TaskPriorityRow } from '@/types/dal';
import type { PersonRow, TagRow }from '@/types/schema';
import { formatMediumDate } from '@/lib/utils/dates';

interface Props {
  task:       TaskDetail;
  statuses:   TaskStatusRow[];
  priorities: TaskPriorityRow[];
  people:     PersonRow[];
  tags:       TagRow[];
}

export function TaskDetailClient({ task, statuses, priorities, people }: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [mode,      setMode]      = useState<'view' | 'edit'>('view');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [deleting,  setDeleting]  = useState(false);

  const [title,      setTitle]      = useState(task.title);
  const [statusId,   setStatusId]   = useState(String(task.status_id));
  const [priorityId, setPriorityId] = useState(String(task.priority_id));
  const [dueDate,    setDueDate]    = useState(task.due_date ?? '');
  const [personId,   setPersonId]   = useState(task.person_id ? String(task.person_id) : '');
  const [bodyMd,     setBodyMd]     = useState(task.body_md ?? '');

  const doneStatus = statuses.find(s => s.is_terminal);

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      await updateTask(supabase, task.id, {
        title,
        status_id:   Number.parseInt(statusId),
        priority_id: Number.parseInt(priorityId),
        due_date:    dueDate || null,
        person_id:   personId ? Number.parseInt(personId) : null,
        body_md:     bodyMd || null,
      });
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
      setMode('view');
      router.refresh();
    } catch {
      setSaveState('error');
    }
  }, [supabase, task.id, title, statusId, priorityId, dueDate, personId, bodyMd, router]);

  const complete = useCallback(async () => {
    if (!doneStatus) return;
    await completeTask(supabase, task.id, doneStatus.id);
    router.push('/tasks');
  }, [supabase, task.id, doneStatus, router]);

  const remove = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteTask(supabase, task.id);
      router.push('/tasks');
    } finally { setDeleting(false); }
  }, [supabase, task.id, router]);

  if (mode === 'view') {
    return (
      <div>
        <div className="detail-page__header">
          <h2 className="detail-page__title">{title}</h2>
          <div className="detail-page__actions">
            {!task.completed_at && doneStatus && (
              <Button variant="accent" size="sm" onClick={complete}>✓ Complete</Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setMode('edit')}>✏️ Edit</Button>
            <ConfirmButton onConfirm={remove} disabled={deleting}>✕ Delete</ConfirmButton>
          </div>
        </div>

        <dl className="detail-page__fields">
          <div className="detail-page__field">
            <dt>Status</dt>
            <dd>
              <span className="badge">{task.status.status_name}</span>
              {task.completed_at && (
                <span className="detail-page__field-note">
                  Completed {new Date(task.completed_at).toLocaleDateString()}
                </span>
              )}
            </dd>
          </div>
          <div className="detail-page__field">
            <dt>Priority</dt>
            <dd><span className="badge">{task.priority.priority_name}</span></dd>
          </div>
          <div className="detail-page__field">
            <dt>Due</dt>
            <dd>{formatMediumDate(task.due_date)}</dd>
          </div>
          {task.person && (
            <div className="detail-page__field">
              <dt>Person</dt>
              <dd>{task.person.person_name}</dd>
            </div>
          )}
        </dl>

        {bodyMd && (
          <div className="detail-page__body">
            <p className="detail-page__body-label">Notes</p>
            <pre className="detail-page__body-text">{bodyMd}</pre>
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div>
      <InputField label="Title" id="td-title">
        <input id="td-title" type="text" value={title}
          onChange={e => setTitle(e.target.value)} />
      </InputField>

      <div className="field-grid">
        <InputField label="Status" id="td-status">
          <select id="td-status" value={statusId} onChange={e => setStatusId(e.target.value)}>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.status_name}</option>)}
          </select>
        </InputField>
        <InputField label="Priority" id="td-priority">
          <select id="td-priority" value={priorityId} onChange={e => setPriorityId(e.target.value)}>
            {priorities.map(p => <option key={p.id} value={p.id}>{p.priority_name}</option>)}
          </select>
        </InputField>
      </div>

      <div className="field-grid">
        <InputField label="Due date" id="td-due">
          <input id="td-due" type="date" value={dueDate}
            onChange={e => setDueDate(e.target.value)} />
        </InputField>
        <InputField label="Person" id="td-person">
          <select id="td-person" value={personId} onChange={e => setPersonId(e.target.value)}>
            <option value="">No person</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.person_name}</option>)}
          </select>
        </InputField>
      </div>

      <InputField label="Notes" id="td-body">
        <textarea id="td-body" value={bodyMd}
          onChange={e => setBodyMd(e.target.value)} />
      </InputField>

      <div className="page-actions">
        <Button variant="accent" onClick={save} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
        <SaveStatus state={saveState} />
      </div>
    </div>
  );
}
