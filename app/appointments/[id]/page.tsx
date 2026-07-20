import { notFound }                from 'next/navigation';
import { createClient }            from '@/lib/supabase/server';
import { getAppointmentById }      from '@/lib/dal/appointments';
import { getAppointmentTypes, getProviderTypes, getPeople } from '@/lib/dal/reference';
import { AppointmentDetailClient } from '@/components/appointments/AppointmentDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailPage({ params }: Props) {
  const { id } = await params;
  const numId  = parseInt(id);
  if (isNaN(numId)) notFound();

  const supabase = await createClient();
  const appt     = await getAppointmentById(supabase, numId);
  if (!appt) notFound();

  // Fetch providers (need full list for edit form)
  const [apptTypes, people, { data: providers }] = await Promise.all([
    getAppointmentTypes(supabase),
    getPeople(supabase),
    supabase.from('providers').select('*').order('provider_name'),
  ]);

  return (
    <div className="page-content">
      <div className="page-header">
        <a href="/appointments" className="page-back-link">← Appointments</a>
        <h1 className="page-header__title">Appointment</h1>
      </div>
      <AppointmentDetailClient
        appointment={appt}
        appointmentTypes={apptTypes}
        people={people}
        providers={providers ?? []}
      />
    </div>
  );
}
