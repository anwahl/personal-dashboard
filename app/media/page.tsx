import { createClient }            from '@/lib/supabase/server';
import { getMediaEntries }         from '@/lib/dal/media';
import { getMediaTypes, getMediaStatuses, getMediaGenres,
         getMediaStatusTypeLinks } from '@/lib/dal/reference';
import { MediaClient }             from '@/components/media/MediaClient';

export default async function MediaPage() {
  const supabase = await createClient();
  const [entries, mediaTypes, mediaStatuses, genres, statusTypeLinks] = await Promise.all([
    getMediaEntries(supabase),
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
