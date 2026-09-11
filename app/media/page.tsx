import { createClient }            from '@/lib/supabase/server';
import { getMediaEntries, getInProgressMediaEntries }         from '@/lib/dal/media';
import { getMediaTypes, getMediaStatuses,
         getMediaStatusTypeLinks } from '@/lib/dal/reference';
import { MediaClient }             from '@/components/media/MediaClient';
import { QuickMediaLog }           from '@/components/media/QuickMediaLog';
import { Header, PageBody } from '@/components/layout';

export default async function MediaPage() {
  const supabase = await createClient();
  const [entries, inProgressEntries, mediaTypes, mediaStatuses, statusTypeLinks] = await Promise.all([
    getMediaEntries(supabase),
    getInProgressMediaEntries(supabase),
    getMediaTypes(supabase),
    getMediaStatuses(supabase),
    getMediaStatusTypeLinks(supabase),
  ]);

  return (
    <PageBody>
      <Header title='🎬 Media' />
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
        statusTypeLinks={statusTypeLinks}
      />
    </PageBody>
  );
}
