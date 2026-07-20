import Link                              from 'next/link';
import { notFound }                      from 'next/navigation';
import { createClient }                  from '@/lib/supabase/server';
import { ensureDailyEntry, addDays }     from '@/lib/dal/daily';
import { getSleepEntry, getPriorSleepContext } from '@/lib/dal/sleep';
import { getDailySymptomData }           from '@/lib/dal/symptoms';
import { getEssEntry }                   from '@/lib/dal/ess';
import { getActivePrescriptions }        from '@/lib/dal/prescriptions';
import { getReferenceData }              from '@/lib/dal/reference';
import { DailyPageClient }               from '@/components/daily-log/DailyPageClient';
import { TaskList }                      from '@/components/tasks/TaskList';
import { UpcomingAppointments }          from '@/components/appointments/UpcomingAppointments';
import { getTasksByDateContext }          from '@/lib/dal/tasks';
import { getUpcomingAppointments }       from '@/lib/dal/appointments';
import { getTaskStatuses, getTaskPriorities } from '@/lib/dal/reference';

interface Props {
  params: Promise<{ date: string }>;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

export default async function DailyPage({ params }: Props) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const supabase  = await createClient();
  const entry     = await ensureDailyEntry(supabase, date);
  const reference = await getReferenceData(supabase);
  const self      = reference.people.find(p => p.is_self);

  const [sleep, symptoms, ess, prescriptions, priorSleep, taskData, appointments, statuses, priorities] = await Promise.all([
    getSleepEntry(supabase, entry.id),
    getDailySymptomData(supabase, entry.id),
    getEssEntry(supabase, entry.id),
    self ? getActivePrescriptions(supabase, self.id) : Promise.resolve([]),
    getPriorSleepContext(supabase, date, entry.id),
    getTasksByDateContext(supabase, date),
    getUpcomingAppointments(supabase, date, 6),
    getTaskStatuses(supabase, true),
    getTaskPriorities(supabase),
  ]);

  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, 1);

  return (
    <div className="page-content">
      <nav className="date-nav" aria-label="Day navigation">
        <Link href={`/daily/${prevDate}`} className="date-nav__link">
          ← {formatShort(prevDate)}
        </Link>
        <Link href={`/daily/${nextDate}`} className="date-nav__link">
          {formatShort(nextDate)} →
        </Link>
      </nav>

      <div className="page-header">
        <h1 className="page-header__title">
          {entry.icon ? `${entry.icon} ` : ''}{formatDate(date)}
        </h1>
      </div>

      <DailyPageClient
        entry={entry}
        date={date}
        sleep={sleep}
        priorSleep={priorSleep}
        symptoms={symptoms}
        ess={ess}
        prescriptions={prescriptions}
        reference={reference}
      />

      <div className="daily-extras">
        <TaskList
          contextDate={date}
          initialData={taskData}
          statuses={statuses}
          priorities={priorities}
          people={reference.people}
        />
        <UpcomingAppointments
          appointments={appointments}
          contextDate={date}
        />
      </div>
    </div>
  );
}
