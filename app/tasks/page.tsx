import { createClient }   from '@/lib/supabase/server';
import { getTasksByDateContext } from '@/lib/dal/tasks';
import { getTaskStatuses, getTaskPriorities, getAssignablePeople } from '@/lib/dal/reference';
import { TaskList } from '@/components/tasks/TaskList';
import { localTodayISO } from '@/lib/utils/dates';
import { QuickAdd } from '@/components/tasks/TaskForm';

export default async function TasksPage() {
  const supabase = await createClient();
  const [taskData, statuses, priorities, people] = await Promise.all([
    getTasksByDateContext(supabase, localTodayISO()),
    getTaskStatuses(supabase, true),   // include all for form
    getTaskPriorities(supabase),
    getAssignablePeople(supabase),
  ]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">✅ Tasks</h1>
      </div>
      <QuickAdd
        statuses={statuses} 
        priorities={priorities}
        people={people}
      />
      <TaskList
        contextDate={localTodayISO()}
        initialData={taskData}
        statuses={statuses}
        people={people}
      />
    </div>
  );
}
