'use client';

import { InputField, SaveStatus, SaveState,
  Button, ConfirmButton, Markdown, Card, CardBody,
  CardTitle, CardHeader }                              from '@/components/ui';
import { useState, useCallback }                       from 'react';
import { useRouter }                                   from 'next/navigation';
import { createClient }                                from '@/lib/supabase/client';
import { updateTask, updateTaskStatus,
         deleteTask, spawnNextRecurrence }              from '@/lib/dal/tasks';
import type { TaskDetail, TaskStatusRow,
              TaskPriorityRow }                         from '@/types/dal';
import type { PersonRow, TagRow, TaskRow }              from '@/types/schema';
import { formatLongDate, formatMediumDate, formatTime,
         localISODateFromDateString, toLocalInput }     from '@/lib/utils/dates';
import { TaskForm, type TaskFormValues }                from './TaskForm';

interface Props {
  task:       TaskDetail;
  statuses:   TaskStatusRow[];
  priorities: TaskPriorityRow[];
  people:     PersonRow[];
  tags:       TagRow[];
}

export function TaskDetailClient({
  task, statuses, priorities, people,
}: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [mode,      setMode]      = useState<'view' | 'edit'>('view');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [deleting,  setDeleting]  = useState(false);

  const doneStatus = statuses.find(s => s.is_terminal);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (values: TaskFormValues) => {
    setSaveState('saving');
    try {
      const reminderPayload = values.reminder_at
        ? {
            reminder_at:          values.reminder_at,
            recurrence_frequency: (values.recurrence_frequency || null) as TaskRow['recurrence_frequency'],
            recurrence_interval:  values.recurrence_interval
              ? Number.parseInt(values.recurrence_interval) : null,
            recurrence_days:      values.recurrence_days || null,
            recurrence_end_date:  values.recurrence_end_date || null,
          }
        : {
            reminder_at:          null,
            recurrence_frequency: null,
            recurrence_interval:  null,
            recurrence_days:      null,
            recurrence_end_date:  null,
          };

      await updateTask(supabase, task.id, {
        title:              values.title,
        status_id:          Number.parseInt(values.status_id),
        priority_id:        Number.parseInt(values.priority_id),
        due_date:           values.due_date  || null,
        due_time:           values.due_time  || null,
        person_id:          values.person_id ? Number.parseInt(values.person_id) : null,
        body_md:            values.body_md   || null,
        snoozed_until:      null,
        reminder_last_sent: null,
        ...reminderPayload,
      });

      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
      setMode('view');
      router.refresh();
    } catch(e) {

      console.error('Task save failed:', e);
      setSaveState('error');
    }
  }, [supabase, task.id, router]);

  // ── Complete ──────────────────────────────────────────────────────────────
  const complete = useCallback(async () => {
    if (!doneStatus) return;
    const todoStatus = statuses.find(s => !s.is_terminal);
    await updateTaskStatus(supabase, task.id, doneStatus.id);
    if (task.recurrence_frequency && task.reminder_at && todoStatus) {
      await spawnNextRecurrence(supabase, task, todoStatus.id);
    }
    router.push('/tasks');
  }, [supabase, task, statuses, doneStatus, router]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const remove = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteTask(supabase, task.id);
      router.push('/tasks');
    } finally {
      setDeleting(false);
    }
  }, [supabase, task.id, router]);

  // ── View mode ─────────────────────────────────────────────────────────────
  if (mode === 'view') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>View Task</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="detail-page__header">
            <h2 className="detail-page__title">{task.title}</h2>
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
              <dd><span className="badge">{task.status.status_name}</span></dd>
            </div>
            <div className="detail-page__field">
              <dt>Priority</dt>
              <dd><span className="badge">{task.priority.priority_name}</span></dd>
            </div>
            <div className="detail-page__field">
              <dt>Due</dt>
              <dd>
                {formatMediumDate(task.due_date)}
                {task.due_time ? ' · ' + formatTime(task.due_time) : ''}
              </dd>
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
                  !task.status.is_terminal && new Date(task.reminder_at) < new Date()
                    ? ' task-reminder-badge--overdue' : ''
                }`}>
                  🔔 {formatLongDate(task.reminder_at)}
                  {task.recurrence_frequency && ` ↻ ${task.recurrence_frequency}`}
                </dd>
              </div>
            )}
          </dl>

          {task.body_md && (
            <div className="detail-page__body">
              <p className="detail-page__body-label">Notes</p>
              <div className="detail-page__body-markdown">
                <Markdown>{task.body_md}</Markdown>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Task</CardTitle>
      </CardHeader>
      <TaskForm
        initialValues={{
          title:                task.title,
          status_id:            String(task.status_id),
          priority_id:          String(task.priority_id),
          due_date:             task.due_date  ?? '',
          due_time:             task.due_time  ?? '',
          person_id:            task.person_id ? String(task.person_id) : '',
          body_md:              task.body_md   ?? '',
          reminder_at:          task.reminder_at ? toLocalInput(task.reminder_at) : '',
          recurrence_frequency: task.recurrence_frequency  ?? '',
          recurrence_interval:  String(task.recurrence_interval ?? 1),
          recurrence_days:      task.recurrence_days        ?? '',
          recurrence_end_date:  task.recurrence_end_date    ?? '',
        }}
        statuses={statuses}
        priorities={priorities}
        people={people}
        showStatus
        saving={saveState === 'saving'}
        saveState={saveState}
        onSave={handleSave}
        onCancel={() => setMode('view')}
      />
    </Card>
  );
}