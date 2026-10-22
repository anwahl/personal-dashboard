import { createClient }       from '@/lib/supabase/server';
import { getLastTimeEntries } from '@/lib/dal/lasttime';
import { getIconsRef }        from '@/lib/dal/reference';
import { LastTimeTracker }    from '@/components/last-time/LastTimeTracker';
import { Header, PageBody }   from '@/components/layout';
import { Button }             from '@/components/ui';

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

      {/* What's tracked here is managed in Settings → Last Time. */}
      <Button variant="ghost" size="sm" href="/settings?tab=lasttime">⚙️ Manage Last Time items</Button>
    </PageBody>
  );
}
