import { notFound }             from 'next/navigation';
import { createClient }         from '@/lib/supabase/server';
import { getMediaEntryById, getStatusHistory } from '@/lib/dal/media';
import { getMediaTypes, getMediaStatuses, getMediaStatusTypeLinks } from '@/lib/dal/reference';
import { MediaDetailClient }    from '@/components/media/MediaDetailClient';
import { Header, PageBody } from '@/components/layout';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MediaDetailPage({ params }: Readonly<Props>) {
  const { id } = await params;
  const numId  = Number.parseInt(id);
  if (Number.isNaN(numId)) notFound();

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
    <PageBody>
      <Header title='Media Detail' href='/media' linkLabel='← Media' />

      <MediaDetailClient
        entry={entry}
        statusHistory={statusHistory}
        mediaTypes={mediaTypes}
        mediaStatuses={mediaStatuses}
        statusTypeLinks={statusTypeLinks}
      />
    </PageBody>
  );
}
