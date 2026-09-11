import { notFound }                      from 'next/navigation';
import { createClient }                  from '@/lib/supabase/server';
import { getPrescriptionById,
  getPrescriptionChangesByRx }           from '@/lib/dal/prescriptions';
import { PrescriptionDetailClient }      from '@/components/medications/PrescriptionDetailClient';
import { Header, PageBody }              from '@/components/layout';

interface Props { params: Promise<{ id: string }>; }

export default async function PrescriptionDetailPage({ params }: Readonly<Props>) {
  const { id }   = await params;
  const rxId     = Number.parseInt(id);
  if (Number.isNaN(rxId)) notFound();

  const supabase = await createClient();
  const rx = await getPrescriptionById(supabase, rxId);
  if (!rx) notFound();

  const name = rx.alias ?? rx.medication.medication_name;

  return (
    <PageBody>
      <Header href='/medications' linkLabel='← Medications' title={name} />
      <PrescriptionDetailClient
        prescription={rx}
      />
    </PageBody>
  );
}
