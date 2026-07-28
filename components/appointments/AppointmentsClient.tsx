'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import Link                      from 'next/link';
import { createClient }          from '@/lib/supabase/client';
import { createAppointment, updateAppointment, deleteAppointment } from '@/lib/dal/appointments';
import { Button }                from '@/components/ui/Button';
import { InputField }            from '@/components/ui/Display';
import { localTodayISO, daysUntil, formatMediumDate, formatTime } from '@/lib/utils/dates';
import type { AppointmentDetail }    from '@/types/dal';
import type { AppointmentTypeRow, PersonRow, ProviderRow } from '@/types/schema';

interface Props {
  upcoming:         AppointmentDetail[];
  past:             AppointmentDetail[];
  appointmentTypes: AppointmentTypeRow[];
  people:           PersonRow[];
  providers:        ProviderRow[];
}

// ── Appointment row (collapsible) ─────────────────────────────────────────────

function ApptRow({ appt, onEdit }: Readonly<{ appt: AppointmentDetail; onEdit: () => void }>) {
  const [expanded, setExpanded] = useState(false);
  const isPast = appt.appointment_date < localTodayISO();

  return (
    <>
      <div
        className={`list-item${isPast ? ' list-item--muted' : ''}${expanded ? ' list-item--expanded' : ''}`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="list-item__body">
          <div className="list-item__title">
            {appt.appointment_type?.type_name ?? 'Appointment'}
            {appt.provider ? ` · ${appt.provider.provider_name ?? appt.provider.practice_name ?? ''}` : ''}
          </div>
          <div className="list-item__meta">
            <span>
              {formatMediumDate(appt.appointment_date)}
              {appt.appointment_time ? ` · ${formatTime(appt.appointment_time)}` : ''}
            </span>
            {appt.person  && <span>For: {appt.person.person_name}</span>}
            {appt.location && <span>📍 {appt.location}</span>}
          </div>
        </div>
        <div className="list-item__actions">
          <span className={`badge${!isPast ? ' badge--accent' : ''}`}>
            {daysUntil(appt.appointment_date)}
          </span>
          <span className="list-item__chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="expand-panel">
          {appt.questions && (
            <>
              <p className="expand-panel__label">Questions to ask</p>
              <p className="expand-panel__text">{appt.questions}</p>
            </>
          )}
          {appt.notes && (
            <>
              <p className="expand-panel__label">Notes</p>
              <p className="expand-panel__text">{appt.notes}</p>
            </>
          )}
          {!appt.questions && !appt.notes && (
            <p className="expand-panel__empty">No questions or notes.</p>
          )}
          <div className="expand-panel__actions">
            <Link href={`/appointments/${appt.id}`} className="btn btn--ghost btn--sm">
              View Details →
            </Link>
            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onEdit(); }}>
              ✏️ Edit
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormState {
  appointment_date: string; appointment_time: string; person_id: string;
  provider_id: string; appointment_type_id: string;
  location: string; questions: string; notes: string;
}

const EMPTY: FormState = {
  appointment_date: '', appointment_time: '', person_id: '', provider_id: '',
  appointment_type_id: '', location: '', questions: '', notes: '',
};

function toForm(a: AppointmentDetail): FormState {
  return {
    appointment_date:    a.appointment_date,
    appointment_time:    a.appointment_time         ?? '',
    person_id:           String(a.person_id),
    provider_id:         a.provider_id         ? String(a.provider_id)         : '',
    appointment_type_id: a.appointment_type_id ? String(a.appointment_type_id) : '',
    location:  a.location  ?? '',
    questions: a.questions ?? '',
    notes:     a.notes     ?? '',
  };
}

function ApptForm({ form, setForm, people, appointmentTypes, providers, onSave, onCancel, onDelete, editId, saving }: Readonly<{
  form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>;
  people: PersonRow[]; appointmentTypes: AppointmentTypeRow[]; providers: ProviderRow[];
  onSave: () => void; onCancel: () => void; onDelete?: () => void;
  editId?: number; saving: boolean;
}>) {
  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="form-panel--card">
      <p className="form-panel__title">{editId ? 'Edit Appointment' : 'New Appointment'}</p>

      <div className="field-grid">
        <InputField label="Date" id="a-date">
          <input id="a-date" type="date" value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)} />
        </InputField>
        <InputField label="Time" id="a-time">
          <input id="a-time" type="time" value={form.appointment_time} onChange={e => set('appointment_time', e.target.value)} />
        </InputField>
      </div>
      <div className="field-grid">
        <InputField label="For" id="a-person">
          <select id="a-person" value={form.person_id} onChange={e => set('person_id', e.target.value)}>
            <option value="">Select person…</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.person_name}</option>)}
          </select>
        </InputField>
        <InputField label="Type" id="a-type">
          <select id="a-type" value={form.appointment_type_id} onChange={e => set('appointment_type_id', e.target.value)}>
            <option value="">Select type…</option>
            {appointmentTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
          </select>
        </InputField>
      </div>
      <InputField label="Provider" id="a-provider">
        <select id="a-provider" value={form.provider_id} onChange={e => set('provider_id', e.target.value)}>
          <option value="">No provider linked</option>
          {providers.map(p => <option key={p.id} value={p.id}>{p.provider_name ?? p.practice_name}</option>)}
        </select>
      </InputField>
      <InputField label="Location" id="a-location">
        <input id="a-location" type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Office, telehealth…" />
      </InputField>
      <InputField label="Questions to ask" id="a-questions">
        <textarea id="a-questions" value={form.questions} onChange={e => set('questions', e.target.value)} placeholder="Topics to cover…" className="textarea--short" />
      </InputField>
      <InputField label="Notes" id="a-notes">
        <textarea id="a-notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes from the appointment…" className="textarea--short" />
      </InputField>

      <div className="form-panel__actions">
        <Button variant="accent" onClick={onSave} disabled={saving || !form.appointment_date || !form.person_id}>
          {saving ? 'Saving…' : editId ? 'Update' : 'Add Appointment'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        {onDelete && <Button variant="danger" onClick={onDelete} disabled={saving}>Delete</Button>}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AppointmentsClient({ upcoming, past, appointmentTypes, people, providers }: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [localUpcoming, setLocalUpcoming] = useState(upcoming);
  const [localPast,     setLocalPast]     = useState(past);
  useEffect(() => { setLocalUpcoming(upcoming); }, [upcoming]);
  useEffect(() => { setLocalPast(past); }, [past]);

  const [showForm,   setShowForm]   = useState(false);
  const [showPast,   setShowPast]   = useState(false);
  const [editTarget, setEditTarget] = useState<AppointmentDetail | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY);
  const [saving,     setSaving]     = useState(false);

  const openNew  = () => { setEditTarget(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (a: AppointmentDetail) => { setEditTarget(a); setForm(toForm(a)); setShowForm(true); };
  const cancel   = () => { setShowForm(false); setEditTarget(null); };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        appointment_date:    form.appointment_date,
        appointment_time:    form.appointment_time    || null,
        person_id:           Number.parseInt(form.person_id),
        provider_id:         form.provider_id         ? Number.parseInt(form.provider_id)         : null,
        appointment_type_id: form.appointment_type_id ? Number.parseInt(form.appointment_type_id) : null,
        location:  form.location  || null,
        questions: form.questions || null,
        notes:     form.notes     || null,
        followup_for_id: null,
      };
      if (editTarget) await updateAppointment(supabase, editTarget.id, payload);
      else            await createAppointment(supabase, payload);
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
          editId={editTarget?.id} saving={saving}
        />
      ) : (
        <div className="page-actions">
          <Button variant="accent" onClick={openNew}>+ New Appointment</Button>
        </div>
      )}

      <div className="section-divider">Upcoming ({localUpcoming.length})</div>
      {localUpcoming.length === 0
        ? <p className="empty-state">No upcoming appointments.</p>
        : localUpcoming.map(a => <ApptRow key={a.id} appt={a} onEdit={() => openEdit(a)} />)
      }

      <div className="toggle-btn-section">
        <Button
          variant="ghost"
          className="toggle-btn"
          onClick={() => setShowPast(s => !s)}
        >
          {showPast ? '▲ Hide' : '▼ Show'} past appointments ({localPast.length})
        </Button>

        {showPast && (
          <div className="toggle-btn-section__body">
            {localPast.length === 0
              ? <p className="empty-state">No past appointments on record.</p>
              : localPast.map(a => <ApptRow key={a.id} appt={a} onEdit={() => openEdit(a)} />)
            }
          </div>
        )}
      </div>
    </div>
  );
}
