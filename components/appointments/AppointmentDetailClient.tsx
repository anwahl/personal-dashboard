'use client';

import { InputField, SaveStatus, SaveState } from '@/components/ui/Display';
import { useState, useCallback, useEffect }  from 'react';
import { useRouter }               from 'next/navigation';
import { createClient }            from '@/lib/supabase/client';
import {
  updateAppointment, deleteAppointment, createAppointment,
  getPrescriptionChanges, createPrescriptionChange, deletePrescriptionChange,
} from '@/lib/dal/appointments';
import { getActivePrescriptions }  from '@/lib/dal/prescriptions';
import { createTask }              from '@/lib/dal/tasks';
import { Button }                  from '@/components/ui/Button';
import { ConfirmButton }           from '@/components/ui/ConfirmButton';
import type { AppointmentDetail, PrescriptionDetail } from '@/types/dal';
import type {
  AppointmentTypeRow, PersonRow, ProviderRow,
  PrescriptionChangeRow, TaskStatusRow, TaskPriorityRow,
} from '@/types/schema';
import { daysUntil, formatMediumDate, formatTime, localTodayISO } from '@/lib/utils/dates';

interface Props {
  appointment:      AppointmentDetail;
  appointmentTypes: AppointmentTypeRow[];
  people:           PersonRow[];
  providers:        ProviderRow[];
  taskStatuses:     TaskStatusRow[];
  taskPriorities:   TaskPriorityRow[];
}

// ── Medication changes section ────────────────────────────────────────────────

function MedChangesSection({ appointmentId, personId }: Readonly<{ appointmentId: number; personId: number }>) {
  const supabase = createClient();
  const [changes,      setChanges]      = useState<PrescriptionChangeRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDetail[]>([]);
  const [loaded,       setLoaded]       = useState(false);
  const [open,         setOpen]         = useState(false);
  const [rxId,         setRxId]         = useState('');
  const [field,        setField]        = useState('');
  const [prevVal,      setPrevVal]      = useState('');
  const [newVal,       setNewVal]       = useState('');
  const [noteText,     setNoteText]     = useState('');
  const [saving,       setSaving]       = useState(false);

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([
      getPrescriptionChanges(supabase, appointmentId),
      getActivePrescriptions(supabase, personId),
    ]);
    setChanges(c);
    setPrescriptions(p);
    setLoaded(true);
  }, [supabase, appointmentId]);

  const toggle = async () => {
    if (!open && !loaded) await load();
    setOpen(o => !o);
  };

  const add = async () => {
    if (!rxId || !field.trim() || saving) return;
    setSaving(true);
    try {
      const row = await createPrescriptionChange(supabase, {
        appointment_id:  appointmentId,
        prescription_id: Number.parseInt(rxId),
        field_changed:   field.trim(),
        previous_value:  prevVal.trim() || null,
        new_value:       newVal.trim() || null,
        change_notes:    noteText.trim() || null,
      });
      setChanges(prev => [row, ...prev]);
      setRxId(''); setField(''); setPrevVal(''); setNewVal(''); setNoteText('');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await deletePrescriptionChange(supabase, id);
    setChanges(prev => prev.filter(c => c.id !== id));
  };

  const rxName = (id: number) => {
    const rx = prescriptions.find(p => p.id === id);
    return rx ? (rx.alias ?? rx.medication.medication_name) : `#${id}`;
  };

  return (
    <div className="appt-section">
      <button type="button" className="toggle-btn" onClick={toggle}>
        💊 Medication Changes {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="appt-section__body">
          {changes.length === 0 && !saving && (
            <p className="expand-panel__empty">No medication changes logged for this appointment.</p>
          )}
          {changes.map(c => (
            <div key={c.id} className="manage-item">
              <span className="manage-item__name">
                {rxName(c.prescription_id)} — {c.field_changed}
                {(c.previous_value || c.new_value) && (
                  <span className="manage-item__meta">
                    {c.previous_value ? ` ${c.previous_value}` : ''}
                    {c.previous_value && c.new_value ? ' →' : ''}
                    {c.new_value ? ` ${c.new_value}` : ''}
                  </span>
                )}
                {c.change_notes && <span className="manage-item__meta"> · {c.change_notes}</span>}
              </span>
              <div className="manage-item__actions">
                <ConfirmButton onConfirm={() => remove(c.id)} size="sm">✕</ConfirmButton>
              </div>
            </div>
          ))}

          <div className="appt-med-change-form">
            <div className="field-grid">
              <div>
                <label className="field-label">Medication</label>
                <select className="settings-select" value={rxId} onChange={e => setRxId(e.target.value)}>
                  <option value="">Select medication…</option>
                  {prescriptions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.alias ?? p.medication.medication_name}
                      {p.dose ? ` ${p.dose}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Field changed</label>
                <input type="text" value={field} onChange={e => setField(e.target.value)}
                  placeholder="dose, timing, discontinued…" />
              </div>
            </div>
            <div className="field-grid">
              <div>
                <label className="field-label">Previous value</label>
                <input type="text" value={prevVal} onChange={e => setPrevVal(e.target.value)} placeholder="Before…" />
              </div>
              <div>
                <label className="field-label">New value</label>
                <input type="text" value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="After…" />
              </div>
            </div>
            <div>
              <label className="field-label">Notes</label>
              <input type="text" className="input--flex" value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Additional context…" />
            </div>
            <div className="form-panel__actions" style={{ marginTop: 8 }}>
              <Button size="sm" variant="accent" onClick={add}
                disabled={saving || !rxId || !field.trim()}>
                {saving ? '…' : '+ Add Change'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AppointmentDetailClient({
  appointment: appt, appointmentTypes, people, providers,
  taskStatuses, taskPriorities,
}: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [mode,      setMode]      = useState<'view' | 'edit'>('view');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);
  const [creatingTask,     setCreatingTask]     = useState(false);
  const [taskCreated,      setTaskCreated]      = useState(false);

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
        appointment_type_id: typeId   ? Number.parseInt(typeId)   : null,
        person_id:           Number.parseInt(personId),
        provider_id:         provId   ? Number.parseInt(provId)   : null,
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

  const createFollowUp = useCallback(async () => {
    setCreatingFollowUp(true);
    try {
      const followUp = await createAppointment(supabase, {
        appointment_date:    localTodayISO(),  // placeholder; user will edit
        appointment_time:    null,
        person_id:           appt.person_id,
        provider_id:         appt.provider_id ?? null,
        appointment_type_id: appt.appointment_type_id ?? null,
        location:            appt.location ?? null,
        questions:           null,
        notes:               null,
        followup_for_id:     appt.id,
      });
      router.push(`/appointments/${followUp.id}`);
    } finally { setCreatingFollowUp(false); }
  }, [supabase, appt, router]);

  const createTaskFromAppt = useCallback(async () => {
    const todoStatus   = taskStatuses.find(s => s.status_name === 'todo' || !s.is_terminal);
    const normalPrio   = taskPriorities.find(p => p.priority_name === 'normal') ?? taskPriorities[0];
    if (!todoStatus || !normalPrio) return;
    setCreatingTask(true);
    try {
      const typeName = appt.appointment_type?.type_name ?? 'Appointment';
      const prov     = appt.provider?.provider_name ?? appt.provider?.practice_name ?? '';
      const title    = `Follow up from ${typeName}${prov ? ` with ${prov}` : ''} (${formatMediumDate(appt.appointment_date)})`;
      await createTask(supabase, {
        title,
        status_id:      todoStatus.id,
        priority_id:    normalPrio.id,
        due_date:       null,
        person_id:      appt.person_id,
        body_md:        null,
        completed_at:   null,
      });
      setTaskCreated(true);
      setTimeout(() => setTaskCreated(false), 3000);
    } finally { setCreatingTask(false); }
  }, [supabase, appt, taskStatuses, taskPriorities]);

  if (mode === 'view') {
    const countdown = daysUntil(appt.appointment_date);
    const isPast    = appt.appointment_date < localTodayISO();

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
          {countdown}
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
          {appt.followup_for_id && (
            <div className="detail-page__field">
              <dt>Follow-up of</dt>
              <dd>
                <a href={`/appointments/${appt.followup_for_id}`} className="text-link">
                  Appointment #{appt.followup_for_id}
                </a>
              </dd>
            </div>
          )}
        </dl>

        {questions && (
          <div className="detail-page__body">
            <p className="detail-page__body-label">Questions</p>
            <pre className="detail-page__body-text">{questions}</pre>
          </div>
        )}
        {notes && (
          <div className="detail-page__body">
            <p className="detail-page__body-label">Notes</p>
            <pre className="detail-page__body-text">{notes}</pre>
          </div>
        )}

        {/* Action buttons */}
        <div className="appt-quick-actions">
          <Button variant="ghost" size="sm" onClick={createFollowUp} disabled={creatingFollowUp}>
            {creatingFollowUp ? '…' : '📅 Create Follow-up'}
          </Button>
          <Button variant="ghost" size="sm" onClick={createTaskFromAppt} disabled={creatingTask}>
            {taskCreated ? '✓ Task created' : creatingTask ? '…' : '✅ Create Task'}
          </Button>
        </div>

        <MedChangesSection appointmentId={appt.id} personId={appt.person_id} />
      </div>
    );
  }

  // Edit mode
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
