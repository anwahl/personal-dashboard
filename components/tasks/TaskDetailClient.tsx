'use client';

import { InputField, SaveStatus, SaveState, Button, ConfirmButton, Markdown } from '@/components/ui';
import { useState, useEffect, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/client';
import { updateTask, completeTask, deleteTask, spawnNextRecurrence } from '@/lib/dal/tasks';
import type { TaskDetail, TaskStatusRow, TaskPriorityRow } from '@/types/dal';
import type { PersonRow, TagRow }from '@/types/schema';
import { formatMediumDate, localISODateFromDateString } from '@/lib/utils/dates';

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
  const [dueTime,    setDueTime]    = useState(task.due_time ?? '');
  const [personId,   setPersonId]   = useState(task.person_id ? String(task.person_id) : '');
  const [bodyMd,     setBodyMd]     = useState(task.body_md ?? '');

  // Reminder state
  const toLocalInput = (iso: string) => {
    const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const [reminderAt, setReminderAt] = useState(
      task.reminder_at        ? toLocalInput(task.reminder_at)  :
      task.due_date           ? toLocalInput(task.due_date)     :
      ''
  );
  useEffect(() => { 
    if (!reminderAt && dueDate) {
        setReminderAt(toLocalInput(dueDate));
    }
  }, [dueDate]);

  const [recurrenceFrequency, setRecurrenceFrequency] = useState(task.recurrence_frequency ?? '');
  const [recurrenceInterval,  setRecurrenceInterval]  = useState(String(task.recurrence_interval ?? 1));
  const [recurrenceDays,      setRecurrenceDays]      = useState(task.recurrence_days ?? '');
  const [recurrenceEndDate,   setRecurrenceEndDate]   = useState(task.recurrence_end_date ?? '');

  const doneStatus = statuses.find(s => s.is_terminal);

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      const reminderPayload = reminderAt ? {
        reminder_at:          localISODateFromDateString(reminderAt),
        recurrence_frequency: (recurrenceFrequency || null) as import('@/types/schema').TaskRow['recurrence_frequency'],
        recurrence_interval:  recurrenceInterval ? Number.parseInt(recurrenceInterval) : null,
        recurrence_days:      recurrenceDays || null,
        recurrence_end_date:  recurrenceEndDate || null,
      } : {
        reminder_at: null, recurrence_frequency: null, recurrence_interval: null,
        recurrence_days: null, recurrence_end_date: null,
      };
      await updateTask(supabase, task.id, {
        title,
        status_id:   Number.parseInt(statusId),
        priority_id: Number.parseInt(priorityId),
        due_date:    dueDate || null,
        due_time:    dueTime  || null,
        person_id:   personId ? Number.parseInt(personId) : null,
        body_md:     bodyMd || null,
        ...reminderPayload,
        snoozed_until: null,
        reminder_last_sent: null,
      });
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
      setMode('view');
      router.refresh();
    } catch {
      setSaveState('error');
    }
  }, [supabase, task.id, title, statusId, priorityId, dueDate, dueTime, personId, bodyMd, reminderAt, recurrenceFrequency, recurrenceInterval, recurrenceDays, recurrenceEndDate, router]);

  const complete = useCallback(async () => {
    if (!doneStatus) return;
    const todoStatus = statuses.find(s => !s.is_terminal);
    await completeTask(supabase, task.id, doneStatus.id);
    if (task.recurrence_frequency && task.reminder_at && todoStatus) {
      await spawnNextRecurrence(supabase, task, todoStatus.id);
    }
    router.push('/tasks');
  }, [supabase, task, statuses, doneStatus, router]);

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
            <dd>{formatMediumDate(task.due_date)}{task.due_time ? ' · ' + task.due_time.slice(0,5) : ''}</dd>
          </div>
          {task.person && (
            <div className="detail-page__field">
              <dt>Person</dt>
              <dd>{task.person.person_name}</dd>
            </div>
          )}
          {task.reminder_at && (
            <div className="detail-page__field">
              <dt>Reminder</dt>
              <dd className={`task-reminder-badge${
                (task.reminder_at && !task.status.is_terminal && new Date(task.reminder_at) < new Date()) ? ' task-reminder-badge--overdue' : ''
              }`}>
                🔔 {new Date(task.reminder_at).toLocaleString()}
                {task.recurrence_frequency && ` ↻ ${task.recurrence_frequency}`}
              </dd>
            </div>
          )}
        </dl>

        {bodyMd && (
          <div className="detail-page__body">
            <p className="detail-page__body-label">Notes</p>
            <div className="detail-page__body-markdown">
                <Markdown>{bodyMd}</Markdown>
            </div>
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
        <InputField label="Time" id="td-time">
          <input id="td-time" type="time" value={dueTime}
            onChange={e => setDueTime(e.target.value)} />
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

      {/* Reminder section */}
      <div className="reminder-section" style={{ marginTop: 16 }}>
        <div className="reminder-section__row">
          <span className="reminder-section__label">Reminder</span>
          <input type="datetime-local" value={reminderAt ? reminderAt : dueTime ? new Date(`${dueDate}T${dueTime}`).toLocaleString() : reminderAt}
            onChange={e => { setReminderAt(e.target.value); if (!e.target.value) { setRecurrenceFrequency(''); setRecurrenceDays(''); setRecurrenceEndDate(''); }}} />
          {reminderAt && <button type="button" className="reminder-section__toggle" onClick={() => { setReminderAt(''); setRecurrenceFrequency(''); setRecurrenceDays(''); setRecurrenceEndDate(''); }}>✕ Clear</button>}
        </div>
        {reminderAt && (
          <div className="reminder-section__fields">
            <div className="reminder-section__row">
              <span className="reminder-section__label">Repeat</span>
              <select value={recurrenceFrequency} onChange={e => { setRecurrenceFrequency(e.target.value); setRecurrenceDays(''); }}>
                <option value="">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            {recurrenceFrequency && (
              <>
                <div className="reminder-section__row">
                  <span className="reminder-section__label">Every</span>
                  <input type="number" min="1" max="99" className="reminder-section__interval"
                    value={recurrenceInterval} onChange={e => setRecurrenceInterval(e.target.value)} />
                </div>
                {recurrenceFrequency === 'weekly' && (
                  <div className="reminder-section__row">
                    <span className="reminder-section__label">On</span>
                    <div className="weekday-chips">
                      {[{code:'MO',label:'Mo'},{code:'TU',label:'Tu'},{code:'WE',label:'We'},{code:'TH',label:'Th'},{code:'FR',label:'Fr'},{code:'SA',label:'Sa'},{code:'SU',label:'Su'}].map(({code,label}) => {
                        const active = recurrenceDays.split(',').includes(code);
                        return <button key={code} type="button" className={`weekday-chip${active ? ' weekday-chip--active' : ''}`} onClick={() => { const d = recurrenceDays.split(',').filter(Boolean); setRecurrenceDays(active ? d.filter(x=>x!==code).join(',') : [...d,code].join(',')); }}>{label}</button>;
                      })}
                    </div>
                  </div>
                )}
                <div className="reminder-section__row">
                  <span className="reminder-section__label">Until</span>
                  <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} />
                  {recurrenceEndDate && <button type="button" className="reminder-section__toggle" onClick={() => setRecurrenceEndDate('')}>✕</button>}
                </div>
              </>
            )}
          </div>
        )}
      </div>

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
