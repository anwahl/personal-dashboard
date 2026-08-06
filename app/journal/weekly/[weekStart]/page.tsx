import { notFound }           from 'next/navigation';
import { createClient }       from '@/lib/supabase/server';
import {
  getWeeklyEntry,
  getWeeklyJournalCategories,
  getWeeklyResponses,
} from '@/lib/dal/weekly-journal';
import { getSundayOfWeek, getSundayWeekNumber, formatWeekRange } from '@/lib/utils/dates';
import { WeeklyJournalClient } from '@/components/weekly-journal/WeeklyJournalClient';

interface Props {
  params: Promise<{ weekStart: string }>;
}

export default async function WeeklyJournalPage({ params }: Readonly<Props>) {
  const { weekStart } = await params;

  // Validate: must be a YYYY-MM-DD that is a Sunday
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) notFound();
  const normalized = getSundayOfWeek(weekStart);
  if (normalized !== weekStart) {
    // Redirect non-Sundays to their Sunday
    const { redirect } = await import('next/navigation');
    redirect(`/journal/weekly/${normalized}`);
  }

  const supabase   = await createClient();
  const categories = await getWeeklyJournalCategories(supabase);

  const entry    = await getWeeklyEntry(supabase, weekStart);
  const responses = entry ? await getWeeklyResponses(supabase, entry.id) : [];

  const weekNum   = getSundayWeekNumber(weekStart);
  const weekRange = formatWeekRange(weekStart);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">Weekly Journal</h1>
        <p className="page-header__subtitle">Week {weekNum} · {weekRange}</p>
      </div>
      <WeeklyJournalClient
        weekStart={weekStart}
        weekNum={weekNum}
        weekRange={weekRange}
        existingEntry={entry}
        categories={categories}
        responses={responses}
      />
    </div>
  );
}
