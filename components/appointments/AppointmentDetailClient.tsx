'use client';

import { InputField, SaveStatus, SaveState } from '@/components/ui/Display';
import { useState, useCallback }             from 'react';
import { useRouter }                         from 'next/navigation';
import { createClient }                      from '@/lib/supabase/client';
import {
  updateAppointment, deleteAppointment, createAppointment,
  deletePrescriptionChange,
} from '@/lib/dal/appointments';
import { applyPrescriptionChanges }  from '@/lib/dal/prescriptions';
import type { FieldChangeEntry }     from '@/lib/dal/prescriptions';
import { createTask }                from '@/lib/dal/tasks';
import { Button }                    from '@/components/ui/Button';
import { ConfirmButton }             from '@/components/ui/ConfirmButton';
import { Markdown }  from '@/components/ui/Markdown';
import type { AppointmentDetail, PrescriptionDetail } from '@/types/dal';
import type {
  AppointmentTypeRow, PersonRow, ProviderRow,
  PrescriptionChangeRow, TaskStatusRow, TaskPriorityRow,
  MedicationTimingTypeRow,
} from '@/types/schema';
import { daysUntil, formatMediumDate, formatTime, localTodayISO } from '@/lib/utils/dates';

// ── Prescription field definitions ────────────────────────────────────────────

const RX_FIELDS = [
  { key: 'dose',              label: 'Dose',              type: 'text'   },
  { key: 'timing_type_id',    label: 'Timing',            type: 'timing' },
  { key: 'purpose',           label: 'Purpose',           type: 'text'   },
  { key: 'alias',             label: 'Alias / Nickname',  type: 'text'   },
  { key: 'start_date',        label: 'Start Date',        type: 'date'   },
  { key: 'discontinued_date', label: 'Discontinued Date', type: 'date'   },
  { key: 'is_active',         label: 'Status',            type: 'status' },
] as const;

type RxFieldKey = typeof RX_FIELDS[number]['key'];

function getRxDisplayValue(
  rx:      PrescriptionDetail,
  key:     RxFieldKey,
  timings: MedicationTimingTypeRow[],
): string {
  switch (key) {
    case 'dose':              return rx.dose              ?? '';
    case 'timing_type_id':    return timings.find(t => t.id === rx.timing_type_id)?.timing_name ?? '';
    case 'purpose':           return rx.purpose           ?? '';
    case 'alias':             return rx.alias             ?? '';
    case 'start_date':        return rx.start_date        ? formatMediumDate(rx.start_date)        : '';
    case 'discontinued_date': return rx.discontinued_date ? formatMediumDate(rx.discontinued_date) : '';
    case 'is_active':         return rx.is_active ? 'Active' : 'Discontinued';
    default:                  return '';
  }
}

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

// ── Pending field change type ─────────────────────────────────────────────────

interface PendingChange {
  uid:           string;
  fieldKey:      RxFieldKey;
  fieldLabel:    string;
  previousValue: string;
  newValue:      string;
  newTimingId:   string;
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
  const [open,     setOpen]    = useState(false);
  const [history,  setHistory] = useState(initialHistory);
  const [selectedRxId, setSelectedRxId] = useState('');
  const [pending,  setPending] = useState<PendingChange[]>([]);
  const [saving,   setSaving]  = useState(false);

  const selectedRx = activePrescriptions.find(p => String(p.id) === selectedRxId) ?? null;

  const addFieldChange = (key: RxFieldKey) => {
    if (!selectedRx) return;
    const def  = RX_FIELDS.find(f => f.key === key)!;
    const prev = getRxDisplayValue(selectedRx, key, medicationTimings);
    setPending(p => [...p, {
      uid:           `${key}-${Date.now()}`,
      fieldKey:      key,
      fieldLabel:    def.label,
      previousValue: prev,
      newValue:      key === 'is_active' ? (selectedRx.is_active ? 'Discontinued' : 'Active') : prev,
      newTimingId:   key === 'timing_type_id' ? String(selectedRx.timing_type_id ?? '') : '',
    }]);
  };

  const updatePending = (uid: string, patch: Partial<PendingChange>) =>
    setPending(p => p.map(c => c.uid === uid ? { ...c, ...patch } : c));
  const removePending = (uid: string) =>
    setPending(p => p.filter(c => c.uid !== uid));

  const apply = async () => {
    if (!selectedRx || pending.length === 0 || saving) return;
    setSaving(true);
    try {
      const entries: FieldChangeEntry[] = pending.map(c => {
        let rawValue: unknown;
        switch (c.fieldKey) {
          case 'timing_type_id': rawValue = c.newTimingId ? Number.parseInt(c.newTimingId) : null; break;
          case 'is_active':      rawValue = c.newValue === 'Active'; break;
          default:               rawValue = c.newValue || null;
        }
        return {
          fieldKey:      c.fieldKey,
          fieldLabel:    c.fieldLabel,
          previousValue: c.previousValue,
          newValue:      c.fieldKey === 'timing_type_id'
            ? (medicationTimings.find(t => String(t.id) === c.newTimingId)?.timing_name ?? c.newTimingId)
            : c.newValue,
          rawValue,
        };
      });
      const newRows = await applyPrescriptionChanges(supabase, selectedRx.id, appointmentId, entries);
      setHistory(h => [...newRows, ...h]);
      setPending([]);
      setSelectedRxId('');
      router.refresh();   // re-runs server component → fresh prescriptions + history
    } finally { setSaving(false); }
  };

  const removeHistory = async (id: number) => {
    await deletePrescriptionChange(supabase, id);
    setHistory(h => h.filter(r => r.id !== id));
  };

  const rxName = (id: number) => {
    const rx = activePrescriptions.find(p => p.id === id);
    return rx ? (rx.alias ?? rx.medication.medication_name) : `#${id}`;
  };

  const availableFields = RX_FIELDS.filter(f => !pending.some(c => c.fieldKey === f.key));

  return (
    <div className="appt-section">
      <Button variant="ghost" className="toggle-btn" onClick={() => setOpen(o => !o)}>
        💊 Prescription Changes {open ? '▲' : '▼'}
      </Button>

      {open && (
        <div className="appt-section__body">
          {/* History log */}
          {history.length > 0 && (
            <div className="appt-section__history">
              <p className="expand-panel__label">Change Log</p>
              {history.map(h => (
                <div key={h.id} className="manage-item">
                  <span className="manage-item__name">
                    {rxName(h.prescription_id)} — {h.field_changed}
                    {(h.previous_value || h.new_value) && (
                      <span className="manage-item__meta">
                        {h.previous_value ? ` ${h.previous_value}` : ''}
                        {h.previous_value && h.new_value ? ' →' : ''}
                        {h.new_value ? ` ${h.new_value}` : ''}
                      </span>
                    )}
                  </span>
                  <div className="manage-item__actions">
                    <ConfirmButton onConfirm={() => removeHistory(h.id)} size="sm">✕</ConfirmButton>
                  </div>
                </div>
              ))}
            </div>
          )}
          {history.length === 0 && pending.length === 0 && (
            <p className="expand-panel__empty">No prescription changes logged for this appointment.</p>
          )}

          {/* Change form */}
          <div className="appt-med-change-form">
            <div className="field-grid">
              <InputField label="Prescription" id="rx-select">
                <select id="rx-select" value={selectedRxId}
                  onChange={e => { setSelectedRxId(e.target.value); setPending([]); }}>
                  <option value="">Select prescription…</option>
                  {activePrescriptions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.alias ?? p.medication.medication_name}{p.dose ? ` · ${p.dose}` : ''}
                    </option>
                  ))}
                </select>
              </InputField>

              {selectedRx && availableFields.length > 0 && (
                <InputField label="Add field to change" id="rx-field-add">
                  <select id="rx-field-add" value=""
                    onChange={e => { if (e.target.value) addFieldChange(e.target.value as RxFieldKey); }}>
                    <option value="">+ Add field…</option>
                    {availableFields.map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </InputField>
              )}
            </div>

            {pending.map(c => (
              <div key={c.uid} className="rx-field-change-row">
                <span className="rx-field-change-row__label">{c.fieldLabel}</span>
                <span className="rx-field-change-row__prev">{c.previousValue || '—'}</span>
                <span className="rx-field-change-row__arrow">→</span>
                {c.fieldKey === 'timing_type_id' ? (
                  <select className="rx-field-change-row__input" value={c.newTimingId}
                    onChange={e => updatePending(c.uid, { newTimingId: e.target.value })}>
                    <option value="">No timing</option>
                    {medicationTimings.map(t => (
                      <option key={t.id} value={t.id}>{t.timing_name}</option>
                    ))}
                  </select>
                ) : c.fieldKey === 'is_active' ? (
                  <select className="rx-field-change-row__input" value={c.newValue}
                    onChange={e => updatePending(c.uid, { newValue: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>
                ) : (
                  <input type={c.fieldKey.endsWith('_date') ? 'date' : 'text'}
                    className="rx-field-change-row__input"
                    value={c.newValue}
                    onChange={e => updatePending(c.uid, { newValue: e.target.value })}
                    placeholder="New value…" />
                )}
                <Button size="icon" variant="ghost" onClick={() => removePending(c.uid)}>✕</Button>
              </div>
            ))}

            {pending.length > 0 && (
              <div className="form-panel__actions" style={{ marginTop: 10 }}>
                <Button variant="accent" onClick={apply} disabled={saving}>
                  {saving ? 'Applying…' : `Apply ${pending.length} Change${pending.length > 1 ? 's' : ''}`}
                </Button>
                <Button variant="ghost" onClick={() => { setPending([]); setSelectedRxId(''); }}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
    <div className="follow-up-form">
      <p className="follow-up-form__title">Schedule Follow-up</p>
      <div className="field-grid">
        <InputField label="Date" id="fu-date">
          <input id="fu-date" type="date" value={date} onChange={e => setDate(e.target.value)} autoFocus />
        </InputField>
        <InputField label="Time (optional)" id="fu-time">
          <input id="fu-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
        </InputField>
      </div>
      <p className="follow-up-form__hint">
        Copies: {appt.appointment_type?.type_name ?? 'same type'} ·{' '}
        {appt.person?.person_name ?? 'same person'}
        {appt.provider ? ` · ${appt.provider.provider_name ?? appt.provider.practice_name}` : ''}
      </p>
      <div className="form-panel__actions">
        <Button variant="accent" onClick={create} disabled={saving || !date}>
          {saving ? 'Creating…' : 'Create Follow-up'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
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

  const [date,      setDate]      = useState(appt.appointment_date);
  const [time,      setTime]      = useState(appt.appointment_time ?? '');
  const [typeId,    setTypeId]    = useState(appt.appointment_type_id ? String(appt.appointment_type_id) : '');
  const [personId,  setPersonId]  = useState(String(appt.person_id));
  const [provId,    setProvId]    = useState(appt.provider_id ? String(appt.provider_id) : '');
  const [location,  setLocation]  = useState(appt.location ?? '');
  const [questions, setQuestions] = useState(appt.questions ?? '');
  const [notes,     setNotes]     = useState(appt.notes ?? '');

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      await updateAppointment(supabase, appt.id, {
        appointment_date:    date,
        appointment_time:    time || null,
        appointment_type_id: typeId  ? Number.parseInt(typeId)  : null,
        person_id:           Number.parseInt(personId),
        provider_id:         provId  ? Number.parseInt(provId)  : null,
        location:  location  || null,
        questions: questions || null,
        notes:     notes     || null,
      });
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
      setMode('view');
      router.refresh();
    } catch { setSaveState('error'); }
  }, [supabase, appt.id, date, time, typeId, personId, provId, location, questions, notes, router]);

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
      <div>
        <div className="detail-page__header">
          <div>
            <h2 className="detail-page__title">
              {appt.appointment_type?.type_name ?? 'Appointment'}
            </h2>
            {appt.provider && (
              <p className="detail-page__subtitle">
                {appt.provider.provider_name ?? appt.provider.practice_name ?? ''}
              </p>
            )}
          </div>
          <div className="detail-page__actions">
            <Button variant="ghost" size="sm" onClick={() => setMode('edit')}>✏️ Edit</Button>
            <ConfirmButton onConfirm={remove}>✕ Delete</ConfirmButton>
          </div>
        </div>

        <div className={`appt-detail-countdown${isPast ? ' appt-detail-countdown--past' : ''}`}>
          {daysUntil(appt.appointment_date)}
        </div>

        <dl className="detail-page__fields">
          <div className="detail-page__field">
            <dt>Date</dt>
            <dd>
              {formatMediumDate(appt.appointment_date)}
              {formatTime(appt.appointment_time) ? ` at ${formatTime(appt.appointment_time)}` : ''}
            </dd>
          </div>
          <div className="detail-page__field">
            <dt>For</dt>
            <dd>{appt.person.person_name}</dd>
          </div>
          {appt.location && (
            <div className="detail-page__field">
              <dt>Location</dt>
              <dd>{appt.location}</dd>
            </div>
          )}
          {parentAppt && (
            <div className="detail-page__field">
              <dt>Follow-up of</dt>
              <dd>
                <a href={`/appointments/${parentAppt.id}`} className="text-link">
                  {apptLabel(parentAppt)}
                </a>
              </dd>
            </div>
          )}
        </dl>

        {questions && (
          <div className="detail-page__body">
            <p className="detail-page__body-label">Questions</p>
            <div className="detail-page__body-markdown">
                <Markdown>{questions}</Markdown>
            </div>
          </div>
        )}
        {notes && (
          <div className="detail-page__body">
            <p className="detail-page__body-label">Notes</p>
            <div className="detail-page__body-markdown">
                <Markdown>{notes}</Markdown>
            </div>
          </div>
        )}

        <div className="appt-quick-actions">
          {showFollowUp ? (
            <FollowUpForm
              appt={appt}
              onCreated={id => router.push(`/appointments/${id}`)}
              onCancel={() => setShowFollowUp(false)}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowFollowUp(true)}>
              📅 Schedule Follow-up
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={createTaskForAppt} disabled={creatingTask}>
            {taskCreated ? '✓ Task created' : creatingTask ? '…' : '✅ Create Task'}
          </Button>
        </div>

        <MedChangesSection
          appointmentId={appt.id}
          medicationTimings={medicationTimings}
          activePrescriptions={activePrescriptions}
          initialHistory={prescriptionChanges}
        />
      </div>
    );
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="field-grid">
        <InputField label="Type" id="ad-type">
          <select id="ad-type" value={typeId} onChange={e => setTypeId(e.target.value)}>
            <option value="">No type</option>
            {appointmentTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
          </select>
        </InputField>
        <InputField label="Person" id="ad-person">
          <select id="ad-person" value={personId} onChange={e => setPersonId(e.target.value)}>
            {people.map(p => <option key={p.id} value={p.id}>{p.person_name}</option>)}
          </select>
        </InputField>
      </div>
      <InputField label="Provider" id="ad-prov">
        <select id="ad-prov" value={provId} onChange={e => setProvId(e.target.value)}>
          <option value="">No provider</option>
          {providers.map(p => (
            <option key={p.id} value={p.id}>
              {p.provider_name ?? p.practice_name ?? `Provider ${p.id}`}
            </option>
          ))}
        </select>
      </InputField>
      <div className="field-grid">
        <InputField label="Date" id="ad-date">
          <input id="ad-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </InputField>
        <InputField label="Time" id="ad-time">
          <input id="ad-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
        </InputField>
      </div>
      <InputField label="Location" id="ad-loc">
        <input id="ad-loc" type="text" value={location} onChange={e => setLocation(e.target.value)} />
      </InputField>
      <InputField label="Questions" id="ad-q">
        <textarea id="ad-q" value={questions} onChange={e => setQuestions(e.target.value)} className="textarea--short" />
      </InputField>
      <InputField label="Notes" id="ad-notes">
        <textarea id="ad-notes" value={notes} onChange={e => setNotes(e.target.value)} className="textarea--short" />
      </InputField>
      <div className="page-actions">
        <Button variant="accent" onClick={save} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
        <SaveStatus state={saveState} />
      </div>
    </div>
  );
}
