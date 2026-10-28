'use client';

import { Button, ConfirmButton, 
  Markdown, Card, CardActions, CardBody, CardTitle, CardHeader, 
  useToast, Badge, ModeToggle, Field, FieldGrid,
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
          <CardTitle>{task.title}</CardTitle>
          <CardActions>
            {!task.completed_at && doneStatus && (
              <Button variant="secondary" size="sm" onClick={complete}>✓ Complete</Button>
            )}
            <ModeToggle editing={false} onChange={() => setEditOpen(true)} />
            <ConfirmButton onConfirm={remove} disabled={deleting}>✕ Delete</ConfirmButton>
          </CardActions>
        </CardHeader>
        <CardBody>
          <FieldGrid>
            <Field label="Status"><Badge>{task.status.status_name}</Badge></Field>
            <Field label="Priority"><Badge>{task.priority.priority_name}</Badge></Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Due"
              value={`${formatMediumDate(task.due_date)}${task.due_time ? ' · ' + formatTime(task.due_time) : ''}`} />
            {task.person && <Field label="Person" value={task.person.person_name} />}
          </FieldGrid>
          {task.reminder_at && (
            <Field label="Reminder"
              value={
                <span className={`task-reminder-badge${
                  !task.status.is_terminal && new Date(task.reminder_at) < new Date()
                    ? ' task-reminder-badge--overdue' : ''
                }`}>
                  🔔 {formatLongDate(task.reminder_at)}
                  {task.recurrence_frequency && ` ↻ ${task.recurrence_frequency}`}
                </span>
              } />
          )}
          {task.body_md && (
            <Field label="Notes"><Markdown>{task.body_md}</Markdown></Field>
          )}
        </CardBody>
      </Card>

      <TaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} />
    </>
  );
}
