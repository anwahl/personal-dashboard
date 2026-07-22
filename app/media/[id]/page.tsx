import { notFound }             from 'next/navigation';
import Link                     from 'next/link';
import { createClient }         from '@/lib/supabase/server';
import { getMediaEntryById, getStatusHistory } from '@/lib/dal/media';
import { getMediaTypes, getMediaStatuses, getMediaStatusTypeLinks } from '@/lib/dal/reference';
import { MediaDetailClient }    from '@/components/media/MediaDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MediaDetailPage({ params }: Props) {
  const { id } = await params;
  const numId  = parseInt(id);
  if (isNaN(numId)) notFound();

  const supabase = await createClient();

  const [entry, statusHistory, mediaTypes, mediaStatuses, statusTypeLinks] = await Promise.all([
    getMediaEntryById(supabase, numId).catch(() => null),
    getStatusHistory(supabase, numId),
    getMediaTypes(supabase),
    getMediaStatuses(supabase),
    getMediaStatusTypeLinks(supabase),
  ]);

  if (!entry) notFound();

  return (
    <div className="page-content">
      <Link href="/media" className="page-back-link">← Media</Link>

      <MediaDetailClient
        entry={entry}
        statusHistory={statusHistory}
        mediaTypes={mediaTypes}
        mediaStatuses={mediaStatuses}
        statusTypeLinks={statusTypeLinks}
      />
    </div>
  );
}
