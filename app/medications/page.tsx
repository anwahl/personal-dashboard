import { createClient }          from '@/lib/supabase/server';
import { getAllPrescriptions }    from '@/lib/dal/prescriptions';
import { getMedicationTimingTypes, getPeople } from '@/lib/dal/reference';
import { MedicationsClient }     from '@/components/medications/MedicationsClient';

export default async function MedicationsPage() {
  const supabase = await createClient();
  const people   = await getPeople(supabase);
  const timings  = await getMedicationTimingTypes(supabase);

  // Fetch all prescriptions per person
  const allPrescriptions = await Promise.all(
    people.map(p => getAllPrescriptions(supabase, p.id))
  );

  const prescriptionsByPerson = people.map((p, i) => ({
    person: p,
    prescriptions: allPrescriptions[i],
  }));

  const { data: medications } = await supabase
    .from('medications')
    .select('*')
    .order('medication_name');

  const { data: providers } = await supabase
    .from('providers')
    .select('*')
    .eq('is_active', true)
    .order('provider_name');

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">💊 Medications</h1>
      </div>
      <MedicationsClient
        prescriptionsByPerson={prescriptionsByPerson}
        medications={(medications ?? []) as any[]}
        timingTypes={timings}
        people={people}
        providers={(providers ?? []) as any[]}
      />
    </div>
  );
}
