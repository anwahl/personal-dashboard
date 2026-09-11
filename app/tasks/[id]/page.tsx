import { notFound }             from 'next/navigation';
import { createClient }         from '@/lib/supabase/server';
import { getTaskById }          from '@/lib/dal/tasks';
import { TaskDetailClient }     from '@/components/tasks/TaskDetailClient';
import { Header, PageBody } from '@/components/layout';

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

  return (
    <PageBody>
      <Header title='Task' href='/tasks' linkLabel='← Tasks' />
      <TaskDetailClient task={task} />
    </PageBody>
  );
}
