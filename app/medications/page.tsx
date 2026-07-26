import { createClient }                         from '@/lib/supabase/server';
import { getAllPrescriptions }                  from '@/lib/dal/prescriptions';
import { getMedicationTimingTypes, getPeople, getMedications } from '@/lib/dal/reference';
import { getProviders }                         from '@/lib/dal/providers';
import { MedicationsClient }                    from '@/components/medications/MedicationsClient';

export default async function MedicationsPage() {
  const supabase = await createClient();

  const [people, timings, medications, providers] = await Promise.all([
    getPeople(supabase),
    getMedicationTimingTypes(supabase),
    getMedications(supabase),
    getProviders(supabase),
  ]);

  const allPrescriptions = await Promise.all(
    people.map(p => getAllPrescriptions(supabase, p.id)),
  );

  const prescriptionsByPerson = people.map((p, i) => ({
    person:        p,
    prescriptions: allPrescriptions[i],
  }));

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">💊 Medications</h1>
      </div>
      <MedicationsClient
        prescriptionsByPerson={prescriptionsByPerson}
        medications={medications}
        timingTypes={timings}
        people={people}
        providers={providers}
      />
    </div>
  );
}
