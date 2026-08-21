import { createClient }                         from '@/lib/supabase/server';
import { getAllPrescriptions }                  from '@/lib/dal/prescriptions';
import { getAssignablePeople }                  from '@/lib/dal/reference';
import { PrescriptionsClient }                  from '@/components/medications/PrescriptionsClient';
import { Header, PageBody }                     from '@/components/layout';

export default async function MedicationsPage() {
  const supabase = await createClient();

  const people= await getAssignablePeople(supabase);

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
      />
    </PageBody>
  );
}
