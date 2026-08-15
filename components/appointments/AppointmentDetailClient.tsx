'use client';

import {
  InputField, SaveState, ConfirmButton,
  Markdown,Button, Card, CardHeader,
  CardTitle, CardBody, 
  FieldActions, Field, FieldGrid,
  CardActions,
  ExpandPanel,
  CardSection,
  CardSectionLabel,
  Item, 
  SubCard,
  SubCardBody,
  CardGrid}                       from '@/components/ui';
import { useState, useCallback }              from 'react';
import { useRouter }                          from 'next/navigation';
import { createClient }                       from '@/lib/supabase/client';
import {
  updateAppointment, deleteAppointment,
  createAppointment,deletePrescriptionChange
}                                             from '@/lib/dal/appointments';
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
import { RxPendingChanges }  from '@/components/medications/RxPendingChanges';
import { AppointmentForm, apptToFormValues }  from './AppointmentForm';
import type { AppointmentFormValues }         from './AppointmentForm';
import { PrescriptionChangeDisplayRow } from '../medications/PrescriptionChangeDisplayRow';


// ── Appointment label helper ──────────────────────────────────────────────────

function apptLabel(a: AppointmentDetail): string {
  return [
    a.appointment_type?.type_name,
    a.person?.person_name ? `for ${a.person.person_name}` : null,
    `on ${formatMediumDate(a.appointment_date)}`,
    a.provider?.provider_name || a.provider?.practice_name
      ? `with ${a.provider.provider_name ?? a.provider.practice_name}`
      : null,
  ].filter(Boolean).join(' ');
}


// ── Medication changes section ────────────────────────────────────────────────

function MedChangesSection({
  appointmentId, medicationTimings,
  activePrescriptions, initialHistory,
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
          <Item itemType='info' value='No prescription changes logged for this appointment.' />
        )}
        <InputField label="Prescription" id="rx-select">
          <select id="rx-select" value={selectedRxId}
            onChange={e => setSelectedRxId(e.target.value)}>
            <option value="">Select prescription…</option>
            {activePrescriptions.map(p => (
              <option key={p.id} value={p.id}>
                {p.alias ?? p.medication.medication_name}{p.dose ? ` · ${p.dose}` : ''}
              </option>
            ))}
          </select>
        </InputField>
        {selectedRx && (
          <RxPendingChanges
            key={selectedRxId}
            rx={selectedRx}
            timings={medicationTimings}
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

// ── Follow-up mini form ───────────────────────────────────────────────────────

function FollowUpForm({ appt, onCreated, onCancel }: Readonly<{
  appt:      AppointmentDetail;
  onCreated: (id: number) => void;
  onCancel:  () => void;
}>) {
  const supabase = createClient();
  const [date,   setDate]   = useState('');
  const [time,   setTime]   = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!date || saving) return;
    setSaving(true);
    try {
      const newAppt = await createAppointment(supabase, {
        appointment_date:    date,
        appointment_time:    time || null,
        person_id:           appt.person_id,
        provider_id:         appt.provider_id ?? null,
        appointment_type_id: appt.appointment_type_id ?? null,
        location:            appt.location ?? null,
        questions:           null,
        notes:               null,
        followup_for_id:     appt.id,
      });
      onCreated(newAppt.id);
    } finally { setSaving(false); }
  };

  return (
    <SubCard>
      <CardHeader>
        <CardTitle>
          Schedule Follow-up
        </CardTitle>
      </CardHeader>
      <SubCardBody>
        <FieldGrid>
          <InputField label="Date" id="fu-date">
            <input id="fu-date" type="date" value={date} onChange={e => setDate(e.target.value)} autoFocus />
          </InputField>
          <InputField label="Time (optional)" id="fu-time">
            <input id="fu-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </InputField>
        </FieldGrid>
        <Item itemType='info' itemModifier={['italic', 'meta']}
          value = {
            <>
              Copies: {appt.appointment_type?.type_name ?? 'same type'} ·{' '}
              {appt.person?.person_name ?? 'same person'}
              {appt.provider ? ` · ${appt.provider.provider_name ?? appt.provider.practice_name}` : ''}
            </>
          }
        />
        <FieldActions>
          <Button variant="accent" onClick={create} disabled={saving || !date}>
            {saving ? 'Creating…' : 'Create Follow-up'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </FieldActions>
      </SubCardBody>
    </SubCard>
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

  const [mode,         setMode]         = useState<'view' | 'edit'>('view');
  const [saveState,    setSaveState]    = useState<SaveState>('idle');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [taskCreated,  setTaskCreated]  = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  const handleSave = useCallback(async (values: AppointmentFormValues) => {
    setSaveState('saving');
    try {
      await updateAppointment(supabase, appt.id, {
        appointment_date:    values.appointment_date,
        appointment_time:    values.appointment_time    || null,
        appointment_type_id: values.appointment_type_id ? Number.parseInt(values.appointment_type_id) : null,
        person_id:           Number.parseInt(values.person_id),
        provider_id:         values.provider_id         ? Number.parseInt(values.provider_id)         : null,
        location:  values.location  || null,
        questions: values.questions || null,
        notes:     values.notes     || null,
      });
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
      setMode('view');
      router.refresh();
    } catch { setSaveState('error'); }
  }, [supabase, appt.id, router]);

  const remove = useCallback(async () => {
    await deleteAppointment(supabase, appt.id);
    router.push('/appointments');
  }, [supabase, appt.id, router]);

  const createTaskForAppt = useCallback(async () => {
    const todoStatus = taskStatuses.find(s => !s.is_terminal) ?? taskStatuses[0];
    const normalPrio = taskPriorities.find(p => p.priority_name === 'normal') ?? taskPriorities[0];
    if (!todoStatus || !normalPrio) return;
    setCreatingTask(true);
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
      setTaskCreated(true);
      setTimeout(() => setTaskCreated(false), 3000);
    } finally { setCreatingTask(false); }
  }, [supabase, appt, taskStatuses, taskPriorities]);

  // ── View mode ───────────────────────────────────────────────────────────────

  if (mode === 'view') {
    const isPast = appt.appointment_date < localTodayISO();

    return (
      <Card>
        <CardHeader>
          <CardTitle>{appt.appointment_type?.type_name ?? 'Appointment'}</CardTitle>
          {appt.provider && (
            <>
            {appt.provider.provider_name ?? appt.provider.practice_name ?? ''}
            </>
          )}
          <CardActions>
            <Button variant="ghost" size="sm" onClick={() => setMode('edit')}>✏️ Edit</Button>
            <ConfirmButton onConfirm={remove}>✕ Delete</ConfirmButton>
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

          <CardGrid columns={1} rows>
            {showFollowUp ? (
              <FollowUpForm
                appt={appt}
                onCreated={id => router.push(`/appointments/${id}`)}
                onCancel={() => setShowFollowUp(false)}
              />
            ) : (
              <FieldActions alignment='right'>
                <Button variant="action" size="sm" onClick={() => setShowFollowUp(true)}>
                  📅 Schedule Follow-up
                </Button>
              </FieldActions>
            )}
            <FieldActions alignment='right'>
              <Button variant="action" size="sm" onClick={createTaskForAppt} disabled={creatingTask}>
                {taskCreated ? '✓ Task created' : creatingTask ? '…' : '✅ Create Task'}
              </Button>
            </FieldActions>
          </CardGrid>
        </CardBody>
      </Card>
    );
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────

  return (
    <AppointmentForm
      initialValues={apptToFormValues(appt)}
      appointmentTypes={appointmentTypes}
      people={people}
      providers={providers}
      saving={saveState === 'saving'}
      saveState={saveState}
      onSave={handleSave}
      onCancel={() => setMode('view')}
    />
  );
}