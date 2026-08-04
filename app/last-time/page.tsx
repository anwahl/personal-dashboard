import { createClient }       from '@/lib/supabase/server';
import { getLastTimeEntries } from '@/lib/dal/lasttime';
import { getTrackables, getMediaTypes, getMediaStatuses, getMediaGenres, getIconsRef } from '@/lib/dal/reference';
import { LastTimeTracker }    from '@/components/last-time/LastTimeTracker';
import { LastTimeSettings }   from '@/components/last-time/LastTimeSettings';

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
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">⏱ Last Time</h1>
      </div>

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
    </div>
  );
}
