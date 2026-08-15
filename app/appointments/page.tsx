import { createClient }        from '@/lib/supabase/server';
import { getAllAppointments }   from '@/lib/dal/appointments';
import { getAppointmentTypes, getPeople } from '@/lib/dal/reference';
import { getProviders }        from '@/lib/dal/providers';
import { AppointmentsClient }  from '@/components/appointments/AppointmentsClient';
import { Header, PageBody } from '@/components/layout';

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const [{ upcoming, past }, apptTypes, people, providers] = await Promise.all([
    getAllAppointments(supabase),
    getAppointmentTypes(supabase),
    getPeople(supabase),
    getProviders(supabase),   // active only (default)
  ]);

  return (
    <PageBody>
      <Header title='🏥 Appointments'/>
      <AppointmentsClient
        upcoming={upcoming}
        past={past}
        appointmentTypes={apptTypes}
        people={people}
        providers={providers}
      />
    </PageBody>
  );
}
