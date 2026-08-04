import { notFound }                      from 'next/navigation';
import { createClient }                  from '@/lib/supabase/server';
import { getPrescriptionById }           from '@/lib/dal/prescriptions';
import { getPrescriptionChangesByRx }    from '@/lib/dal/prescriptions';
import { getMedicationTimingTypes }      from '@/lib/dal/reference';
import { PrescriptionDetailClient }      from '@/components/medications/PrescriptionDetailClient';

interface Props { params: Promise<{ id: string }>; }

export default async function PrescriptionDetailPage({ params }: Readonly<Props>) {
  const { id }   = await params;
  const rxId     = Number.parseInt(id);
  if (Number.isNaN(rxId)) notFound();

  const supabase = await createClient();
  const [rx, initialHistory, timings] = await Promise.all([
    getPrescriptionById(supabase, rxId),
    getPrescriptionChangesByRx(supabase, rxId),
    getMedicationTimingTypes(supabase),
  ]);

  if (!rx) notFound();

  const name = rx.alias ?? rx.medication.medication_name;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">{name}</h1>
      </div>
      <PrescriptionDetailClient
        prescription={rx}
        initialHistory={initialHistory}
        timings={timings}
      />
    </div>
  );
}
