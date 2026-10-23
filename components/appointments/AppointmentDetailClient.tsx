'use client';

import {
  SelectField, Markdown, Card, CardHeader, CardTitle, CardBody,
  Field, FieldGrid, CardActions, ExpandPanel, CardSection, CardSectionLabel,
  Item, ModeToggle, RowMenu, useToast,
} from '@/components/ui';
import { useState, useCallback }              from 'react';
import { useRouter }                          from 'next/navigation';
import { createClient }                       from '@/lib/supabase/client';
import { deleteAppointment, deletePrescriptionChange } from '@/lib/dal/appointments';
import { applyPrescriptionChanges }           from '@/lib/dal/prescriptions';
import { createTask }                         from '@/lib/dal/tasks';
import type {
  AppointmentDetail, PrescriptionDetail }     from '@/types/dal';
import type {
  AppointmentTypeRow, PersonRow, ProviderRow,
  PrescriptionChangeRow, TaskStatusRow,
  TaskPriorityRow, MedicationTimingTypeRow }  from '@/types/schema';
import {
  daysUntil, formatMediumDate,
  formatTime, localTodayISO }                 from '@/lib/utils/dates';
import { RxPendingChanges }                   from '@/components/medications/RxPendingChanges';
import { AppointmentDialog }                  from './AppointmentForm';
import { PrescriptionChangeDisplayRow }       from '../medications/PrescriptionChangeDisplayRow';
import { apptLabel } from '@/lib/utils/helpers';

// ── Medication changes section ────────────────────────────────────────────────

function MedChangesSection({
  appointmentId, activePrescriptions, initialHistory,
}: Readonly<{
  appointmentId:      number;
  medicationTimings:  MedicationTimingTypeRow[];
  activePrescriptions: PrescriptionDetail[];
  initialHistory:     PrescriptionChangeRow[];
}>) {
  const supabase   = createClient();
  const router     = useRouter();
  const [history,      setHistory]      = useState(initialHistory);
  const [selectedRxId, setSelectedRxId] = useState('');

  const selectedRx = activePrescriptions.find(p => String(p.id) === selectedRxId) ?? null;

  const removeHistory = async (id: number) => {
    await deletePrescriptionChange(supabase, id);
    setHistory(h => h.filter(r => r.id !== id));
  };

  const grouped = history.reduce<Record<number, typeof history>>((acc, h) => {
    (acc[h.prescription_id] ??= []).push(h);
    return acc;
  }, {});

  const rxName = (id: number) => {
    const rx = activePrescriptions.find(p => p.id === id);
    return rx ? (rx.alias ?? rx.medication.medication_name) : `#${id}`;
  };

  return (
      <ExpandPanel title='💊 Prescription Changes'
        hiddenChildren = {
        <>
        {/* History log */}
        {history.length > 0 && (
          <CardSection>
            <CardSectionLabel>Change Log</CardSectionLabel>
            {Object.entries(grouped).map(([rxId, rows]) => (
              <span key={rxId}>
                <Item itemType='title' itemModifier={['bold','title']} value={rxName(Number(rxId))} />
                {rows.map(h => (
                  <PrescriptionChangeDisplayRow key={h.id} h={h} onRemove={removeHistory} />
                ))}
              </span>
            ))}
          </CardSection>
        )}
        {history.length === 0 && !selectedRxId && (
          <Item itemType='info' value='No prescription changes logged during this appointment.' />
        )}
        <SelectField label="Prescription" value={selectedRxId} onChange={setSelectedRxId}
          placeholder="Select prescription…"
          options={activePrescriptions.map(p => ({
            value: p.id,
            label: `${p.alias ?? p.medication.medication_name}${p.dose ? ` · ${p.dose}` : ''}`,
          }))} />
        {selectedRx && (
          <RxPendingChanges
            key={selectedRxId}
            rx={selectedRx}
            onApply={async entries => {
              const newRows = await applyPrescriptionChanges(supabase, selectedRx.id, appointmentId, entries);
              setHistory(h => [...newRows, ...h]);
              setSelectedRxId('');
              router.refresh();
            }
          }
          />
        )}
        </>
    } />
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  appointment:         AppointmentDetail;
  parentAppt:          AppointmentDetail | null;
  appointmentTypes:    AppointmentTypeRow[];
  people:              PersonRow[];
  providers:           ProviderRow[];
  taskStatuses:        TaskStatusRow[];
  taskPriorities:      TaskPriorityRow[];
  medicationTimings:   MedicationTimingTypeRow[];
  activePrescriptions: PrescriptionDetail[];
  prescriptionChanges: PrescriptionChangeRow[];
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AppointmentDetailClient({
  appointment: appt, parentAppt,
  appointmentTypes, people, providers,
  taskStatuses, taskPriorities,
  medicationTimings, activePrescriptions, prescriptionChanges,
}: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [editOpen,     setEditOpen]     = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const { addToast } = useToast();

  const remove = useCallback(async () => {
    await deleteAppointment(supabase, appt.id);
    router.push('/appointments');
  }, [supabase, appt.id, router]);

  const createTaskForAppt = useCallback(async () => {
    const todoStatus = taskStatuses.find(s => !s.is_terminal) ?? taskStatuses[0];
    const normalPrio = taskPriorities.find(p => p.priority_name === 'normal') ?? taskPriorities[0];
    if (!todoStatus || !normalPrio) return;
    try {
      await createTask(supabase, {
        title:        apptLabel(appt),
        status_id:    todoStatus.id,
        priority_id:  normalPrio.id,
        due_date:     appt.appointment_date,
        person_id:    appt.person_id,
        body_md:      null,
        completed_at: null,
      });
      addToast('Task created', 'success');
    } catch {
      addToast('Couldn’t create the task', 'error');
    }
  }, [supabase, appt, taskStatuses, taskPriorities, addToast]);

  // ── View (editing happens in AppointmentDialog) ─────────────────────────────

  const isPast = appt.appointment_date < localTodayISO();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{appt.appointment_type?.type_name ?? 'Appointment'}</CardTitle>
          <CardActions>
            <ModeToggle editing={false} onChange={() => setEditOpen(true)} />
            <RowMenu
              label="this appointment"
              items={[
                { label: '📅 Schedule follow-up…', onSelect: () => setFollowUpOpen(true) },
                { label: '✅ Create task',          onSelect: createTaskForAppt },
                'separator',
                { label: 'Delete', onSelect: remove, destructive: true },
              ]}
            />
          </CardActions>
        </CardHeader>
        <CardBody>
          <FieldGrid>
            <Field label='Date'
              value={
                <>
                  {formatMediumDate(appt.appointment_date)}
                  {formatTime(appt.appointment_time) ? ` at ${formatTime(appt.appointment_time)}` : ''}
                  <br/>
                  <span className={`appt-detail-countdown${isPast ? ' appt-detail-countdown--past' : ''}`}>
                    {daysUntil(appt.appointment_date)}
                  </span>
                </>
              } />
              <Field label='For' value={appt.person.person_name} />
          </FieldGrid>
          {appt.provider && (
            <Field label='Provider'
              value={
                <>
                  {appt.provider.provider_name ?? appt.provider.practice_name}
                  {appt.provider.provider_name && appt.provider.practice_name ? ` · ${appt.provider.practice_name}` : ''}
                  {appt.provider.phone && <> · <a href={`tel:${appt.provider.phone}`} className="text-link">{appt.provider.phone}</a></>}
                  {appt.provider.portal_url && <> · <a href={appt.provider.portal_url} target="_blank" rel="noreferrer" className="text-link">Patient portal ↗</a></>}
                  {appt.provider.address && <><br />{appt.provider.address}</>}
                </>
              } />
          )}
          <FieldGrid>
            {appt.location && (
              <Field label='Location'
                value={appt.location} />
            )}
            {parentAppt && (
              <Field label='Follow-up of'
                value={
                  <a href={`/appointments/${parentAppt.id}`} className="text-link">
                    {apptLabel(parentAppt)}
                  </a>
                } />
            )}
          </FieldGrid>

          {appt.questions && (
            <Field label='Questions'
              value={
                <Markdown>{appt.questions}</Markdown>
              } />
          )}
          {appt.notes && (
            <Field label='Notes'
              value={
                <Markdown>{appt.notes}</Markdown>
              } />
          )}
          <MedChangesSection
            appointmentId={appt.id}
            medicationTimings={medicationTimings}
            activePrescriptions={activePrescriptions}
            initialHistory={prescriptionChanges}
          />

        </CardBody>
      </Card>

      <AppointmentDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        followUpOf={appt}
        appointmentTypes={appointmentTypes}
        people={people}
        providers={providers}
        onCreated={id => router.push(`/appointments/${id}`)}
      />
      <AppointmentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        appointment={appt}
        appointmentTypes={appointmentTypes}
        people={people}
        providers={providers}
      />
    </>
  );
}
