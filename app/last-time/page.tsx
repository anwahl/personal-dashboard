import { createClient }       from '@/lib/supabase/server';
import { getLastTimeEntries } from '@/lib/dal/lasttime';
import { getTrackables, getMediaTypes, getMediaStatuses, getMediaGenres, getIconsRef } from '@/lib/dal/reference';
import { LastTimeTracker }    from '@/components/last-time/LastTimeTracker';
import { LastTimeSettings }   from '@/components/settings/LastTimeSettings';
import { Header, PageBody } from '@/components/layout';

export default async function LastTimePage() {
  const supabase = await createClient();
  const [entries, icons, allTrackables, mediaTypes, mediaStatuses, mediaGenres] = await Promise.all([
    getLastTimeEntries(supabase),
    getIconsRef(supabase),
    getTrackables(supabase),
    getMediaTypes(supabase),
    getMediaStatuses(supabase),
    getMediaGenres(supabase),
  ]);

  // LastTimeSettings only needs boolean trackables
  const booleanTrackables = allTrackables.filter(t => t.track_type === 'boolean');

  return (
    <PageBody>
      <Header title='⏱ Last Time' />

      <LastTimeTracker entries={entries} icons={icons} />

      <div className="settings-section-gap">
        <LastTimeSettings
          trackables={booleanTrackables}
          mediaTypes={mediaTypes}
          mediaGenres={mediaGenres}
          mediaStatuses={mediaStatuses}
          icons={icons}
        />
      </div>
    </PageBody>
  );
}
