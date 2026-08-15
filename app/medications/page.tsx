import { createClient }                         from '@/lib/supabase/server';
import { getAllPrescriptions }                  from '@/lib/dal/prescriptions';
import { getMedicationTimingTypes, getAssignablePeople, getMedications } from '@/lib/dal/reference';
import { getProviders }                         from '@/lib/dal/providers';
import { PrescriptionsClient }                    from '@/components/medications/PrescriptionsClient';
import { Header, PageBody } from '@/components/layout';

export default async function MedicationsPage() {
  const supabase = await createClient();

  const [people, timings, medications, providers] = await Promise.all([
    getAssignablePeople(supabase),
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
    <PageBody>
      <Header title='💊 Medications'/>
      <PrescriptionsClient
        prescriptionsByPerson={prescriptionsByPerson}
        medications={medications}
        timingTypes={timings}
        people={people}
        providers={providers}
      />
    </PageBody>
  );
}
