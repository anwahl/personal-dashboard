import { notFound }                from 'next/navigation';
import { createClient }            from '@/lib/supabase/server';
import { getAppointmentById }      from '@/lib/dal/appointments';
import { getAppointmentTypes, getPeople } from '@/lib/dal/reference';
import { getProviders }            from '@/lib/dal/providers';
import { AppointmentDetailClient } from '@/components/appointments/AppointmentDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailPage({ params }: Readonly<Props>) {
  const { id } = await params;
  const numId  = Number.parseInt(id);
  if (Number.isNaN(numId)) notFound();

  const supabase = await createClient();
  const appt     = await getAppointmentById(supabase, numId);
  if (!appt) notFound();

  // Fetch providers — include inactive so edit form shows historically-linked ones
  const [apptTypes, people, providers] = await Promise.all([
    getAppointmentTypes(supabase),
    getPeople(supabase),
    getProviders(supabase, true),   // includeInactive = true for edit form
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
        providers={providers}
      />
    </div>
  );
}
