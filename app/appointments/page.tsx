import { createClient }        from '@/lib/supabase/server';
import { getAllAppointments }   from '@/lib/dal/appointments';
import { getAppointmentTypes, getProviderTypes, getPeople } from '@/lib/dal/reference';
import { AppointmentsClient }  from '@/components/appointments/AppointmentsClient';
import { getAllPrescriptions }  from '@/lib/dal/prescriptions';

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const [{ upcoming, past }, apptTypes, people, { data: providers }] = await Promise.all([
    getAllAppointments(supabase),
    getAppointmentTypes(supabase),
    getPeople(supabase),
    supabase.from('providers').select('*').eq('is_active', true).order('provider_name'),
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
        providers={(providers ?? []) as any[]}
      />
    </div>
  );
}
