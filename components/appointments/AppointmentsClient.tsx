'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardBody, CardHeader, CardTitle, Chip, ExpandPanel, FieldActions, Markdown, SubCard, SubCardBody, EmptyState, ListItem, CardSection, CardSectionLabel, RowMenu } from '@/components/ui';
import { daysUntil, formatMediumDate, formatTime } from '@/lib/utils/dates';
import { useContextDate } from '@/components/sections/DayContext';
import type { AppointmentDetail }    from '@/types/dal';
import type { AppointmentTypeRow, PersonRow, ProviderRow } from '@/types/schema';
import { AppointmentDialog } from './AppointmentForm';

interface Props {
  upcoming:         AppointmentDetail[];
  past:             AppointmentDetail[];
  appointmentTypes: AppointmentTypeRow[];
  people:           PersonRow[];
  providers:        ProviderRow[];
}

// ── Appointment row (collapsible) ─────────────────────────────────────────────

function ApptRow({ appt, onEdit }: Readonly<{ appt: AppointmentDetail; onEdit: () => void }>) {
  // "Past" and "in N days" count from a daily page's date when placed on one.
  const contextDate = useContextDate();
  const isPast = appt.appointment_date < contextDate;

  return (
    <>
      <SubCard>
        <SubCardBody>
          <ListItem
            muted={isPast}
            href={`/appointments/${appt.id}`}
            title={
              <CardTitle>
                {appt.appointment_type?.type_name ?? 'Appointment'}
                {appt.provider ? ` · ${appt.provider.provider_name ?? appt.provider.practice_name ?? ''}` : ''}
              </CardTitle>
            }
            meta={
              <>
                <span>
                  {formatMediumDate(appt.appointment_date)}
                  {appt.appointment_time ? ` · ${formatTime(appt.appointment_time)}` : ''}
                </span>
                {appt.person   && <span>For: {appt.person.person_name}</span>}
                {appt.location && <span>📍 {appt.location}</span>}
              </>
            }
            trailing={
              <>
                <Chip small={true} fixed={true} className={`${!isPast ? ' chip--attention' : ''}`}>
                  {daysUntil(appt.appointment_date, contextDate)}
                </Chip>
                <RowMenu
                  label={appt.appointment_type?.type_name ?? 'Appointment'}
                  items={[{ label: 'Edit…', onSelect: onEdit }]}
                />
              </>
            }
          />

          {(appt.questions || appt.notes) && (
            <ExpandPanel title='Show More'
              hiddenChildren = {
                <>
                  {appt.questions && (
                    <>
                      <p className="expand-panel__label">Questions to ask</p>
                      <div className="detail-page__body-markdown">
                        <Markdown>{appt.questions}</Markdown>
                      </div>
                    </>
                    )}
                    {appt.notes && (
                    <>
                      <p className="expand-panel__label">Notes</p>
                      <div className="detail-page__body-markdown">
                        <Markdown>{appt.notes}</Markdown>
                      </div>
                    </>
                  )}
                </>
              } 
            />
          )}
        </SubCardBody>
      </SubCard>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AppointmentsClient({ 
    upcoming, past, appointmentTypes,
    people, providers }:
    Readonly<Props>) {
  const [localUpcoming, setLocalUpcoming] = useState(upcoming);
  const [localPast,     setLocalPast]     = useState(past);
  useEffect(() => { setLocalUpcoming(upcoming); }, [upcoming]);
  useEffect(() => { setLocalPast(past); }, [past]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AppointmentDetail | null>(null);

  const openNew  = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit = (a: AppointmentDetail) => { setEditTarget(a); setDialogOpen(true); };

  return (
    <div>
      <FieldActions docked alignment="right">
        <Button variant="primary" onClick={openNew}>+ New Appointment</Button>
      </FieldActions>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={editTarget}
        appointmentTypes={appointmentTypes}
        people={people}
        providers={providers}
        onDeleted={() => setEditTarget(null)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardBody>  
          <CardSection>
            <CardSectionLabel>Upcoming ({localUpcoming.length})</CardSectionLabel>
            {localUpcoming.length === 0
              ? <EmptyState>No upcoming appointments.</EmptyState>
              : localUpcoming.map(a => <ApptRow key={a.id} appt={a} onEdit={() => openEdit(a)} />)
            }
          </CardSection>

          <ExpandPanel
            title={`Past appointments (${localPast.length})`}
            hiddenChildren={localPast.length === 0
              ? <EmptyState>No past appointments on record.</EmptyState>
              : localPast.map(a => <ApptRow key={a.id} appt={a} onEdit={() => openEdit(a)} />)}
          />
        </CardBody>
      </Card>
    </div>
  );
}