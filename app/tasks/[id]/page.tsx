import { notFound }             from 'next/navigation';
import { createClient }         from '@/lib/supabase/server';
import { getTaskById }          from '@/lib/dal/tasks';
import { getTaskStatuses, getTaskPriorities, getPeople, getTags } from '@/lib/dal/reference';
import { TaskDetailClient }     from '@/components/tasks/TaskDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: Readonly<Props>) {
  const { id } = await params;
  const numId  = Number.parseInt(id);
  if (Number.isNaN(numId)) notFound();

  const supabase = await createClient();
  const task     = await getTaskById(supabase, numId);
  if (!task) notFound();

  const [statuses, priorities, people, tags] = await Promise.all([
    getTaskStatuses(supabase, true),
    getTaskPriorities(supabase),
    getPeople(supabase),
    getTags(supabase),
  ]);

  return (
    <div className="page-content">
      <div className="page-header">
        <a href="/tasks" className="page-back-link">← Tasks</a>
        <h1 className="page-header__title">Task</h1>
      </div>
      <TaskDetailClient
        task={task}
        statuses={statuses}
        priorities={priorities}
        people={people}
        tags={tags}
      />
    </div>
  );
}
