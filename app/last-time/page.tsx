import { createClient }       from '@/lib/supabase/server';
import { getLastTimeEntries } from '@/lib/dal/lasttime';
import { getIconsRef }        from '@/lib/dal/reference';
import { LastTimeTracker }    from '@/components/last-time/LastTimeTracker';
import { Header, PageBody }   from '@/components/layout';

export default async function LastTimePage() {
  const supabase = await createClient();
  const [entries, icons] = await Promise.all([
    getLastTimeEntries(supabase),
    getIconsRef(supabase),
  ]);

  return (
    <PageBody>
      <Header title='⏱ Last Time' />

      <LastTimeTracker entries={entries} icons={icons} />
    </PageBody>
  );
}
