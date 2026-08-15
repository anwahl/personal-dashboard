import { notFound }                      from 'next/navigation';
import { createClient }                  from '@/lib/supabase/server';
import { getPrescriptionById, 
  getPrescriptionChangesByRx }           from '@/lib/dal/prescriptions';
import { getAssignablePeople, getMedications, getMedicationTimingTypes }      from '@/lib/dal/reference';
import { PrescriptionDetailClient }      from '@/components/medications/PrescriptionDetailClient';
import { getProviders } from '@/lib/dal/providers';
import { Header, PageBody } from '@/components/layout';

interface Props { params: Promise<{ id: string }>; }

export default async function PrescriptionDetailPage({ params }: Readonly<Props>) {
  const { id }   = await params;
  const rxId     = Number.parseInt(id);
  if (Number.isNaN(rxId)) notFound();

  const supabase = await createClient();
  const [people, medications, providers, rx, initialHistory, timings] = await Promise.all([
    getAssignablePeople(supabase),
    getMedications(supabase),
    getProviders(supabase),
    getPrescriptionById(supabase, rxId),
    getPrescriptionChangesByRx(supabase, rxId),
    getMedicationTimingTypes(supabase),
  ]);

  if (!rx) notFound();

  const name = rx.alias ?? rx.medication.medication_name;

  return (
    <PageBody>
      <Header href='/medications' linkLabel='← Medications' title={name} />
      <PrescriptionDetailClient
        prescription={rx}
        initialHistory={initialHistory}
        timings={timings}
        medications={medications}
        people={people}
        providers={providers}      />
    </PageBody>
  );
}
