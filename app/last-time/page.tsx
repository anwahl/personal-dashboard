import { createClient }        from '@/lib/supabase/server';
import { getLastTimeEntries }  from '@/lib/dal/lasttime';
import { LastTimeTracker }     from '@/components/last-time/LastTimeTracker';
import { LastTimeSettings }    from '@/components/last-time/LastTimeSettings';

export default async function LastTimePage() {
  const supabase = await createClient();
  const [entries, trackables, mediaTypes, mediaGenres, mediaStatuses] = await Promise.all([
    getLastTimeEntries(supabase),
    supabase.from('daily_trackables').select('*').eq('track_type', 'boolean').eq('is_active', true).order('sort_order').then(r => r.data ?? []),
    supabase.from('media_types').select('*').order('sort_order').then(r => r.data ?? []),
    supabase.from('media_genres').select('*').order('genre_name').then(r => r.data ?? []),
    supabase.from('media_statuses').select('*').order('sort_order').then(r => r.data ?? []),
  ]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">⏱ Last Time</h1>
      </div>

      <LastTimeTracker entries={entries} />

      <div style={{ marginTop: 32 }}>
        <LastTimeSettings
          trackables={trackables as any[]}
          mediaTypes={mediaTypes as any[]}
          mediaGenres={mediaGenres as any[]}
          mediaStatuses={mediaStatuses as any[]}
        />
      </div>
    </div>
  );
}
