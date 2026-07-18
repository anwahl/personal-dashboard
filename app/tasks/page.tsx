import { createClient }   from '@/lib/supabase/server';
import { getActiveTasks, getCompletedTasks } from '@/lib/dal/tasks';
import { getTaskStatuses, getTaskPriorities, getPeople } from '@/lib/dal/reference';
import { TasksClient }    from '@/components/tasks/TasksClient';

export default async function TasksPage() {
  const supabase = await createClient();
  const [active, completed, statuses, priorities, people] = await Promise.all([
    getActiveTasks(supabase),
    getCompletedTasks(supabase, 30),
    getTaskStatuses(supabase, true),   // include all for form
    getTaskPriorities(supabase),
    getPeople(supabase),
  ]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">✅ Tasks</h1>
      </div>
      <TasksClient
        active={active}
        completed={completed}
        statuses={statuses}
        priorities={priorities}
        people={people}
      />
    </div>
  );
}
