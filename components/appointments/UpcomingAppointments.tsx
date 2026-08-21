'use client';

/**
 * UpcomingAppointments — reusable component for Hub and Daily Entry page.
 * Shows the next appointment as a primary countdown card, then a short
 * secondary list. contextDate is the anchor "today" for countdown math.
 */

import { Card, CardHeader, CardTitle, CardBody,
  CardSection, SubCard, SubCardBody, Field, Chip,
  Info, CardSectionLabel, ChipGroup }                   from '@/components/ui';
import type { AppointmentDetail }                       from '@/types/dal';
import { daysUntil, formatMediumDate, formatTime }      from '@/lib/utils/dates';
import Link                                             from 'next/link';
import { FieldGrid }                                    from '../ui/Display';
import { apptLabel }                                    from '@/lib/utils/helpers';

interface Props {
  appointments: AppointmentDetail[];
  contextDate:  string;
}

export function UpcomingAppointments({ appointments, contextDate }: Readonly<Props>) {
  const [primary, ...rest] = appointments;
  const countdown = daysUntil(primary.appointment_date, contextDate);

  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>📅 Appointments</CardTitle></CardHeader>
        <CardBody>
          <p className="empty-state">
            No upcoming appointments.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📅 Appointments</CardTitle>
      </CardHeader>
      <CardBody>
        {/* Primary card */}
        <SubCard>
          <CardHeader>
            <CardTitle>Next Appointment&nbsp;&nbsp;&nbsp;→&nbsp;&nbsp;&nbsp;{apptLabel(primary)}</CardTitle>
          </CardHeader>
          <SubCardBody>
            <Link href={`/appointments/${primary.id}`} className="appt-primary">
              {primary.person && (
                <Field label='For' value={primary.person.person_name} />
              )}
              <Field label='Date' value={`${formatMediumDate(primary.appointment_date)}${primary.appointment_time ? ' ' + formatTime(primary.appointment_time) : ''}`} />
              <Info value={countdown} />
            </Link>
          </SubCardBody>
        </SubCard>

        {/* Secondary list */}
        {rest.length > 0 && (
          <CardSection>
            <CardSectionLabel>Other Appointments...</CardSectionLabel>
            {rest.slice(0, 4).map(appt => (
              <Link key={appt.id} href={`/appointments/${appt.id}`} className="link__generic border__bottom">
                <FieldGrid>
                  <Info value = {apptLabel(appt)} />
                  <ChipGroup>
                    <Chip small={true}>{daysUntil(appt.appointment_date, contextDate)}</Chip>
                  </ChipGroup>
                </FieldGrid>
              </Link>
            ))}
          </CardSection>
        )}
      </CardBody>
    </Card>
  );
}
