'use client';

import { Button, ConfirmButton, 
  Markdown, Card, CardBody, CardTitle, CardHeader, 
  useToast, Badge, ModeToggle
}    from '@/components/ui';
import { useState, useCallback, useEffect }            from 'react';
import { useRouter }                                   from 'next/navigation';
import { createClient }                                from '@/lib/supabase/client';
import { updateTaskStatus, deleteTask, spawnNextRecurrence } from '@/lib/dal/tasks';
import type { TaskDetail }                             from '@/types/dal';
import { formatLongDate, formatMediumDate, formatTime } from '@/lib/utils/dates';
import { TaskDialog }                                  from './TaskForm';
import { useTaskStatuses }                             from '@/lib/hooks/reference';

export function TaskDetailClient({
  task
}: Readonly<{task: TaskDetail;}>) {
  const supabase = createClient();
  const router   = useRouter();

  const [editOpen,  setEditOpen]  = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const { data: statuses = [], error: statusesError } = useTaskStatuses();
  const { addToast } = useToast();
  useEffect(() => { if (statusesError) addToast('Failed to load task statuses', 'error'); }, [statusesError, addToast]);
  const doneStatus = statuses.find(s => s.is_terminal);

  // ── Complete ──────────────────────────────────────────────────────────────
  const complete = useCallback(async () => {
    if (!doneStatus) return;
    const todoStatus = statuses.find(s => !s.is_terminal);
    //TODO There can also maybe be a specific util function for this somewhere
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

  // ── View (editing happens in TaskDialog) ──────────────────────────────────
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>View Task</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="detail-page__header">
            <h2 className="detail-page__title">{task.title}</h2>
            <div className="detail-page__actions">
              {!task.completed_at && doneStatus && (
                <Button variant="secondary" size="sm" onClick={complete}>✓ Complete</Button>
              )}
              <ModeToggle editing={false} onChange={() => setEditOpen(true)} />
              <ConfirmButton onConfirm={remove} disabled={deleting}>✕ Delete</ConfirmButton>
            </div>
          </div>

          {/*TODO refactor here */}
          <dl className="detail-page__fields">
            <div className="detail-page__field">
              <dt>Status</dt>
              <dd><Badge>{task.status.status_name}</Badge></dd>
            </div>
            <div className="detail-page__field">
              <dt>Priority</dt>
              <dd><Badge>{task.priority.priority_name}</Badge></dd>
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

      <TaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} />
    </>
  );
}
