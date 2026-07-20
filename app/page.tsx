import Link                         from 'next/link';
import { createClient }             from '@/lib/supabase/server';
import { localTodayISO }            from '@/lib/dal/daily';
import { getRecentIntention }       from '@/lib/dal/daily';
import { getTasksByDateContext }     from '@/lib/dal/tasks';
import { getUpcomingAppointments }  from '@/lib/dal/appointments';
import { getTaskStatuses, getTaskPriorities, getPeople } from '@/lib/dal/reference';
import { HubClock }                 from '@/components/hub/HubClock';
import { TaskList }                 from '@/components/tasks/TaskList';
import { UpcomingAppointments }     from '@/components/appointments/UpcomingAppointments';

export default async function HubPage() {
  const today    = localTodayISO();
  const supabase = await createClient();

  const [taskData, appointments, intention, statuses, priorities, people] = await Promise.all([
    getTasksByDateContext(supabase, today),
    getUpcomingAppointments(supabase, today, 8),
    getRecentIntention(supabase, today),
    getTaskStatuses(supabase, true),
    getTaskPriorities(supabase),
    getPeople(supabase),
  ]);

  return (
    <div className="page-content hub-page">

      {/* ── Top bar ── */}
      <div className="hub-top">
        <HubClock />
        <Link href={`/daily/${today}`} className="hub-today-btn">
          Today →
        </Link>
      </div>

      {/* ── Intention ── */}
      {intention && (
        <p className="hub-intention">"{intention.value}"</p>
      )}

      {/* ── Main grid ── */}
      <div className="hub-grid">
        <TaskList
          contextDate={today}
          initialData={taskData}
          statuses={statuses}
          priorities={priorities}
          people={people}
        />
        <UpcomingAppointments
          appointments={appointments}
          contextDate={today}
        />
      </div>

    </div>
  );
}
