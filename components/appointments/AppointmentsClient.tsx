'use client';

import { useState, useCallback } from 'react';
import Link                      from 'next/link';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/client';
import { createAppointment, updateAppointment, deleteAppointment } from '@/lib/dal/appointments';
import { Card, CardHeader, CardTitle, CardBody, CardSection, CardSectionLabel } from '@/components/ui/Card';
import { Button }                from '@/components/ui/Button';
import { InputField }            from '@/components/ui/Display';
import type { AppointmentDetail }    from '@/types/dal';
import type { AppointmentTypeRow, PersonRow, ProviderRow } from '@/types/schema';

interface Props {
  upcoming:         AppointmentDetail[];
  past:             AppointmentDetail[];
  appointmentTypes: AppointmentTypeRow[];
  people:           PersonRow[];
  providers:        ProviderRow[];
}

/** Format a Postgres DATE string as a readable date */
function fmtDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtTime(t: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function daysUntil(d: string) {
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d + 'T00:00:00');
  const diff   = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

// ── Appointment item ──────────────────────────────────────────────────────────

function ApptItem({ appt, onEdit }: { appt: AppointmentDetail; onEdit: (a: AppointmentDetail) => void }) {
  const isPast = appt.appointment_date < new Date().toISOString().slice(0, 10);
  return (
    <div className={`list-item${isPast ? ' list-item--muted' : ''}`} onClick={() => onEdit(appt)}>
      <div className="list-item__body">
        <div className="list-item__title">
          {appt.appointment_type?.type_name ?? 'Appointment'}
          {appt.provider ? ` · ${appt.provider.provider_name ?? appt.provider.practice_name ?? ''}` : ''}
        </div>
        <div className="list-item__meta">
          <span>{fmtDate(appt.appointment_date)}{appt.appointment_time ? ` · ${fmtTime(appt.appointment_time)}` : ''}</span>
          {appt.person && <span>For: {appt.person.person_name}</span>}
          {appt.location && <span>📍 {appt.location}</span>}
        </div>
      </div>
      {!isPast && (
        <span className="badge badge--accent">{daysUntil(appt.appointment_date)}</span>
      )}
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormState {
  appointment_date:    string;
  appointment_time:    string;
  person_id:           string;
  provider_id:         string;
  appointment_type_id: string;
  location:            string;
  questions:           string;
  notes:               string;
}

const EMPTY_FORM: FormState = {
  appointment_date: '',
  appointment_time: '',
  person_id: '',
  provider_id: '',
  appointment_type_id: '',
  location: '',
  questions: '',
  notes: '',
};

function apptToForm(a: AppointmentDetail): FormState {
  return {
    appointment_date:    a.appointment_date,
    appointment_time:    a.appointment_time ?? '',
    person_id:           String(a.person_id),
    provider_id:         a.provider_id         ? String(a.provider_id)         : '',
    appointment_type_id: a.appointment_type_id ? String(a.appointment_type_id) : '',
    location:            a.location   ?? '',
    questions:           a.questions  ?? '',
    notes:               a.notes      ?? '',
  };
}

function ApptForm({ form, setForm, people, appointmentTypes, providers, onSave, onCancel, onDelete, editId, saving }: {
  form:             FormState;
  setForm:          React.Dispatch<React.SetStateAction<FormState>>;
  people:           PersonRow[];
  appointmentTypes: AppointmentTypeRow[];
  providers:        ProviderRow[];
  onSave:           () => void;
  onCancel:         () => void;
  onDelete?:        () => void;
  editId?:          number;
  saving:           boolean;
}) {
  const set = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editId ? 'Edit Appointment' : 'New Appointment'}</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="field-grid">
          <InputField label="Date" id="appt-date">
            <input id="appt-date" type="date" value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)} />
          </InputField>
          <InputField label="Time" id="appt-time">
            <input id="appt-time" type="time" value={form.appointment_time} onChange={e => set('appointment_time', e.target.value)} />
          </InputField>
        </div>

        <div className="field-grid">
          <InputField label="For" id="appt-person">
            <select id="appt-person" value={form.person_id} onChange={e => set('person_id', e.target.value)}>
              <option value="">Select person…</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.person_name}</option>)}
            </select>
          </InputField>
          <InputField label="Type" id="appt-type">
            <select id="appt-type" value={form.appointment_type_id} onChange={e => set('appointment_type_id', e.target.value)}>
              <option value="">Select type…</option>
              {appointmentTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
            </select>
          </InputField>
        </div>

        <InputField label="Provider" id="appt-provider">
          <select id="appt-provider" value={form.provider_id} onChange={e => set('provider_id', e.target.value)}>
            <option value="">No provider linked</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.provider_name ?? p.practice_name}</option>)}
          </select>
        </InputField>

        <InputField label="Location" id="appt-location">
          <input id="appt-location" type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Office, telehealth…" />
        </InputField>

        <InputField label="Questions to ask" id="appt-questions">
          <textarea id="appt-questions" value={form.questions} onChange={e => set('questions', e.target.value)} placeholder="Topics to cover…" style={{ minHeight: 70 }} />
        </InputField>

        <InputField label="Notes" id="appt-notes">
          <textarea id="appt-notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes from the appointment…" style={{ minHeight: 70 }} />
        </InputField>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="accent" onClick={onSave} disabled={saving || !form.appointment_date || !form.person_id}>
            {saving ? 'Saving…' : editId ? 'Update' : 'Add Appointment'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          {onDelete && (
            <Button variant="danger" onClick={onDelete} disabled={saving}>Delete</Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AppointmentsClient({ upcoming, past, appointmentTypes, people, providers }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [localUpcoming, setLocalUpcoming] = useState(upcoming);
  const [localPast,     setLocalPast]     = useState(past);
  const [showForm,      setShowForm]      = useState(false);
  const [editTarget,    setEditTarget]    = useState<AppointmentDetail | null>(null);
  const [form,          setForm]          = useState<FormState>(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);

  const openNew  = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (a: AppointmentDetail) => { setEditTarget(a); setForm(apptToForm(a)); setShowForm(true); };
  const cancel   = () => { setShowForm(false); setEditTarget(null); };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        appointment_date:    form.appointment_date,
        appointment_time:    form.appointment_time    || null,
        person_id:           parseInt(form.person_id),
        provider_id:         form.provider_id         ? parseInt(form.provider_id)         : null,
        appointment_type_id: form.appointment_type_id ? parseInt(form.appointment_type_id) : null,
        location:            form.location  || null,
        questions:           form.questions || null,
        notes:               form.notes     || null,
        followup_for_id:     null,
      };

      if (editTarget) {
        await updateAppointment(supabase, editTarget.id, payload);
      } else {
        await createAppointment(supabase, payload);
      }

      router.refresh();
      cancel();
    } finally {
      setSaving(false);
    }
  }, [supabase, form, editTarget, router]);

  const remove = useCallback(async () => {
    if (!editTarget || !confirm('Delete this appointment?')) return;
    setSaving(true);
    try {
      await deleteAppointment(supabase, editTarget.id);
      router.refresh();
      cancel();
    } finally {
      setSaving(false);
    }
  }, [supabase, editTarget, router]);

  return (
    <div>
      {showForm ? (
        <ApptForm
          form={form} setForm={setForm}
          people={people} appointmentTypes={appointmentTypes} providers={providers}
          onSave={save} onCancel={cancel}
          onDelete={editTarget ? remove : undefined}
          editId={editTarget?.id}
          saving={saving}
        />
      ) : (
        <div style={{ marginBottom: 16 }}>
          <Button variant="accent" onClick={openNew}>+ New Appointment</Button>
        </div>
      )}

      {/* Upcoming */}
      <div className="section-divider">Upcoming ({localUpcoming.length})</div>
      {localUpcoming.length === 0
        ? <p className="empty-state">No upcoming appointments.</p>
        : localUpcoming.map(a => <ApptItem key={a.id} appt={a} onEdit={openEdit} />)
      }

      {/* Past */}
      {localPast.length > 0 && (
        <>
          <div className="section-divider" style={{ marginTop: 20 }}>Past</div>
          {localPast.map(a => <ApptItem key={a.id} appt={a} onEdit={openEdit} />)}
        </>
      )}
    </div>
  );
}
