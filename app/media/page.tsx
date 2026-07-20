import { createClient }            from '@/lib/supabase/server';
import { getMediaEntries }         from '@/lib/dal/media';
import { getMediaTypes, getMediaStatuses, getMediaGenres,
         getMediaStatusTypeLinks } from '@/lib/dal/reference';
import { MediaClient }             from '@/components/media/MediaClient';
import { QuickMediaLog }           from '@/components/media/QuickMediaLog';
import { getInProgressMediaEntries } from '@/lib/dal/media';
import { getMediaStatusTypeLinks }   from '@/lib/dal/reference';

export default async function MediaPage() {
  const supabase = await createClient();
  const [entries, inProgressEntries, mediaTypes, mediaStatuses, genres, statusTypeLinks] = await Promise.all([
    getMediaEntries(supabase),
    getInProgressMediaEntries(supabase),
    getMediaTypes(supabase),
    getMediaStatuses(supabase),
    getMediaGenres(supabase),
    getMediaStatusTypeLinks(supabase),
  ]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">🎬 Media</h1>
      </div>
      <QuickMediaLog
        initialEntries={inProgressEntries}
        mediaTypes={mediaTypes}
        mediaStatuses={mediaStatuses}
        statusTypeLinks={statusTypeLinks}
      />
      <MediaClient
        entries={entries}
        mediaTypes={mediaTypes}
        mediaStatuses={mediaStatuses}
        genres={genres}
        statusTypeLinks={statusTypeLinks}
      />
    </div>
  );
}
