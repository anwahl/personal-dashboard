'use client';

/**
 * UpcomingAppointments — reusable component for Hub and Daily Entry page.
 * Shows the next appointment as a primary countdown card, then a short
 * secondary list. contextDate is the anchor "today" for countdown math.
 */

import { Card, CardHeader, CardTitle, CardBody, CardSection } from '@/components/ui/Card';
import type { AppointmentDetail } from '@/types/dal';

interface Props {
  appointments: AppointmentDetail[];
  contextDate:  string;
}

function daysUntil(apptDate: string, contextDate: string): string {
  const [ay, am, ad] = apptDate.split('-').map(Number);
  const [cy, cm, cd] = contextDate.split('-').map(Number);
  const diff = Math.round(
    (new Date(ay, am - 1, ad).getTime() - new Date(cy, cm - 1, cd).getTime()) / 86_400_000
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0)   return `${Math.abs(diff)}d ago`;
  return `In ${diff}d`;
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function fmtTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return ` · ${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function apptLabel(appt: AppointmentDetail): string {
  const type     = appt.appointment_type?.type_name ?? 'Appointment';
  const provider = appt.provider?.provider_name ?? appt.provider?.practice_name ?? '';
  return provider ? `${type} · ${provider}` : type;
}

export function UpcomingAppointments({ appointments, contextDate }: Props) {
  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>📅 Appointments</CardTitle></CardHeader>
        <CardBody><p className="empty-state">No upcoming appointments.</p></CardBody>
      </Card>
    );
  }

  const [primary, ...rest] = appointments;
  const countdown = daysUntil(primary.appointment_date, contextDate);
  const isToday   = countdown === 'Today';
  const isTomorrow = countdown === 'Tomorrow';

  return (
    <Card>
      <CardHeader><CardTitle>📅 Appointments</CardTitle></CardHeader>
      <CardBody>
        {/* Primary card */}
        <a href={`/appointments/${primary.id}`} className="appt-primary">
          <div className={`appt-primary__inner${isToday ? ' appt-primary__inner--today' : ''}`}>
            <div className="appt-primary__type">{apptLabel(primary)}</div>
            {primary.person && (
              <div className="appt-primary__person">For {primary.person.person_name}</div>
            )}
            <div className={`appt-primary__countdown${isToday ? ' appt-primary__countdown--today' : isTomorrow ? ' appt-primary__countdown--tomorrow' : ''}`}>
              {countdown}
            </div>
            <div className="appt-primary__date">
              {fmtDate(primary.appointment_date)}{fmtTime(primary.appointment_time)}
            </div>
          </div>
        </a>

        {/* Secondary list */}
        {rest.length > 0 && (
          <CardSection>
            {rest.slice(0, 4).map(appt => (
              <a key={appt.id} href={`/appointments/${appt.id}`} className="appt-secondary">
                <span className="appt-secondary__label">{apptLabel(appt)}</span>
                <span className="appt-secondary__countdown">
                  {daysUntil(appt.appointment_date, contextDate)}
                </span>
              </a>
            ))}
          </CardSection>
        )}
      </CardBody>
    </Card>
  );
}
