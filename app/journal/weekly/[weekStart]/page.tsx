import { notFound }           from 'next/navigation';
import { createClient }       from '@/lib/supabase/server';
import {
  getWeeklyEntry,
  getWeeklyJournalCategories,
  getWeeklyResponses,
} from '@/lib/dal/weekly-journal';
import { getSundayOfWeek, getSundayWeekNumber, formatWeekRange } from '@/lib/utils/dates';
import { WeeklyJournalClient } from '@/components/weekly-journal/WeeklyJournalClient';
import { Header, PageBody }    from '@/components/layout';

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
    <PageBody>
      <Header title="Weekly Journal" subtitle={`Week ${weekNum} · ${weekRange}`} />
      <WeeklyJournalClient
        weekStart={weekStart}
        weekNum={weekNum}
        weekRange={weekRange}
        existingEntry={entry}
        categories={categories}
        responses={responses}
      />
    </PageBody>
  );
}
