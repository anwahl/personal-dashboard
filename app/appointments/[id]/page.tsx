import { notFound }                from 'next/navigation';
import { createClient }            from '@/lib/supabase/server';
import { getAppointmentById }      from '@/lib/dal/appointments';
import {
  getAppointmentTypes, getPeople,
  getTaskStatuses, getTaskPriorities,
  getMedicationTimingTypes,
} from '@/lib/dal/reference';
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

  const [apptTypes, people, providers, taskStatuses, taskPriorities, medicationTimings, parentAppt] =
    await Promise.all([
      getAppointmentTypes(supabase),
      getPeople(supabase),
      getProviders(supabase, true),
      getTaskStatuses(supabase),
      getTaskPriorities(supabase),
      getMedicationTimingTypes(supabase),
      appt.followup_for_id ? getAppointmentById(supabase, appt.followup_for_id) : Promise.resolve(null),
    ]);

  return (
    <div className="page-content">
      <div className="page-header">
        <a href="/appointments" className="page-back-link">← Appointments</a>
        <h1 className="page-header__title">Appointment</h1>
      </div>
      <AppointmentDetailClient
        appointment={appt}
        parentAppt={parentAppt}
        appointmentTypes={apptTypes}
        people={people}
        providers={providers}
        taskStatuses={taskStatuses}
        taskPriorities={taskPriorities}
        medicationTimings={medicationTimings}
      />
    </div>
  );
}
