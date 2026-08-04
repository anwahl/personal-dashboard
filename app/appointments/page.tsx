import { createClient }        from '@/lib/supabase/server';
import { getAllAppointments }   from '@/lib/dal/appointments';
import { getAppointmentTypes, getPeople } from '@/lib/dal/reference';
import { getProviders }        from '@/lib/dal/providers';
import { AppointmentsClient }  from '@/components/appointments/AppointmentsClient';

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const [{ upcoming, past }, apptTypes, people, providers] = await Promise.all([
    getAllAppointments(supabase),
    getAppointmentTypes(supabase),
    getPeople(supabase),
    getProviders(supabase),   // active only (default)
  ]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">🏥 Appointments</h1>
      </div>
      <AppointmentsClient
        upcoming={upcoming}
        past={past}
        appointmentTypes={apptTypes}
        people={people}
        providers={providers}
      />
    </div>
  );
}
