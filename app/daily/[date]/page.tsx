import { notFound }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/server';
import { ensureDailyEntry, getDailyEntry, todayISO } from '@/lib/dal/daily';
import { getSleepEntry, getPriorSleepContext }        from '@/lib/dal/sleep';
import { getSymptomEntry }       from '@/lib/dal/symptoms';
import { getEssEntry }           from '@/lib/dal/ess';
import { getActivePrescriptions } from '@/lib/dal/prescriptions';
import { getReferenceData }      from '@/lib/dal/reference';
import { DailyLog }              from '@/components/daily-log/DailyLog';
import { HealthLog }             from '@/components/health-log/HealthLog';

interface Props {
  params: Promise<{ date: string }>;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default async function DailyPage({ params }: Props) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const supabase  = await createClient();
  const isToday   = date === todayISO();

  const entry = isToday
    ? await ensureDailyEntry(supabase, date)
    : await getDailyEntry(supabase, date);

  if (!entry) notFound();

  // Find self person for prescriptions
  const reference = await getReferenceData(supabase);
  const self = reference.people.find(p => p.is_self);

  const [sleep, symptoms, ess, prescriptions, priorSleep] = await Promise.all([
    getSleepEntry(supabase, entry.id),
    getSymptomEntry(supabase, entry.id),
    getEssEntry(supabase, entry.id),
    self ? getActivePrescriptions(supabase, self.id) : Promise.resolve([]),
    getPriorSleepContext(supabase, date, entry.id),
  ]);

  return (
    <div className="page-content">
      <div className="page-header">
        <p className="page-header__eyebrow">{isToday ? 'Today' : 'Past Entry'}</p>
        <h1 className="page-header__title">
          {entry.icon ? `${entry.icon} ` : ''}{formatDate(date)}
        </h1>
        {entry.intention && (
          <p className="page-header__subtitle">"{entry.intention.value}"</p>
        )}
      </div>

      <div className="daily-grid">
        <DailyLog
          entry={entry}
          date={date}
          habits={reference.habits}
          tags={reference.tags}
          defaultMode={isToday ? 'input' : 'view'}
        />
        <HealthLog
          entry={entry}
          sleep={sleep}
          priorSleep={priorSleep}
          symptoms={symptoms}
          ess={ess}
          prescriptions={prescriptions}
          reference={reference}
          date={date}
          defaultMode={isToday ? 'input' : 'view'}
        />
      </div>
    </div>
  );
}
