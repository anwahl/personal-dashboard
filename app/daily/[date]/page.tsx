import Link                              from 'next/link';
import { notFound }                      from 'next/navigation';
import { createClient }                  from '@/lib/supabase/server';
import { getDailyEntry }        from '@/lib/dal/daily';
import { addDays } from "@/lib/utils/dates";
import { DailyPageClient }               from '@/components/daily-log/DailyPageClient';
import { getReferenceData, getRandomIntention } from '@/lib/dal/reference';
import { getSections, modulesIn }        from '@/lib/dal/placement';
import { getModuleData }                 from '@/lib/dal/modules';

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

export default async function DailyPage({ params }: Readonly<Props>) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const supabase  = await createClient();
  // Visiting a date doesn't create its entry: it's created the first time
  // something is saved (see DailyPageClient). Until then the day loads empty.
  const entry     = await getDailyEntry(supabase, date);
  const reference = await getReferenceData(supabase);
  // The day's intention: the saved one, or one picked now and stored with the
  // entry when it's created.
  const intention = entry ? entry.intention : await getRandomIntention(supabase);

  const sections = await getSections(supabase, 'DAILY');
  const moduleData = await getModuleData(supabase, modulesIn(sections), date);

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
          {formatDate(date)}
        </h1>
      </div>

      <DailyPageClient
        entry={entry}
        intention={intention}
        date={date}
        sections={sections}
        moduleData={moduleData}
        reference={reference}
      />

    </div>
  );
}
