import { createClient }   from '@/lib/supabase/server';
import { getTasksByDateContext } from '@/lib/dal/tasks';
import { TaskList } from '@/components/tasks/TaskList';
import { localTodayISO } from '@/lib/utils/dates';
import { QuickAdd } from '@/components/tasks/TaskForm';
import { Header, PageBody } from '@/components/layout';

export default async function TasksPage() {
  const supabase = await createClient();
  const taskData = await getTasksByDateContext(supabase, localTodayISO());

  return (
    <PageBody>
      <Header title='✅ Tasks' />
      <QuickAdd />
      <TaskList
        contextDate={localTodayISO()}
        initialData={taskData}
      />
    </PageBody>
  );
}
