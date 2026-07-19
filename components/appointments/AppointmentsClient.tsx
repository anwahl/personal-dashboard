'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/client';
import { createAppointment, updateAppointment, deleteAppointment } from '@/lib/dal/appointments';
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
  const diff   = Math.round((new Date(d + 'T00:00:00').getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0)   return `${Math.abs(diff)}d ago`;
  return `In ${diff}d`;
}

// ── Appointment row (collapsible) ──────────────────────────────────────────────

function ApptRow({ appt, onEdit }: { appt: AppointmentDetail; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isPast = appt.appointment_date < new Date().toISOString().slice(0, 10);

  return (
    <>
      <div
        className={`list-item${isPast ? ' list-item--muted' : ''}`}
        onClick={() => setExpanded(e => !e)}
        style={{ borderRadius: expanded ? 'var(--radius-sm) var(--radius-sm) 0 0' : undefined }}
      >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge${!isPast ? ' badge--accent' : ''}`}>{daysUntil(appt.appointment_date)}</span>
          <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>{expanded ? '▲' : '▼'}</span>
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
            <p style={{ color: 'var(--text-faint)', fontSize: '0.82rem', margin: 0 }}>No questions or notes.</p>
          )}
          <div style={{ marginTop: 10 }}>
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

function ApptForm({ form, setForm, people, appointmentTypes, providers, onSave, onCancel, onDelete, editId, saving }: {
  form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>;
  people: PersonRow[]; appointmentTypes: AppointmentTypeRow[]; providers: ProviderRow[];
  onSave: () => void; onCancel: () => void; onDelete?: () => void;
  editId?: number; saving: boolean;
}) {
  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16 }}>
      <p style={{ fontWeight: 700, marginBottom: 14, margin: '0 0 14px' }}>{editId ? 'Edit Appointment' : 'New Appointment'}</p>

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
        <textarea id="a-questions" value={form.questions} onChange={e => set('questions', e.target.value)} placeholder="Topics to cover…" style={{ minHeight: 70 }} />
      </InputField>
      <InputField label="Notes" id="a-notes">
        <textarea id="a-notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes from the appointment…" style={{ minHeight: 70 }} />
      </InputField>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

export function AppointmentsClient({ upcoming, past, appointmentTypes, people, providers }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  // Sync local state when server re-renders after router.refresh()
  const [localUpcoming, setLocalUpcoming] = useState(upcoming);
  const [localPast,     setLocalPast]     = useState(past);
  useEffect(() => { setLocalUpcoming(upcoming); }, [upcoming]);
  useEffect(() => { setLocalPast(past); }, [past]);

  const [showForm,    setShowForm]   = useState(false);
  const [showPast,    setShowPast]   = useState(false);
  const [editTarget,  setEditTarget] = useState<AppointmentDetail | null>(null);
  const [form,        setForm]       = useState<FormState>(EMPTY);
  const [saving,      setSaving]     = useState(false);

  const openNew  = () => { setEditTarget(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (a: AppointmentDetail) => { setEditTarget(a); setForm(toForm(a)); setShowForm(true); };
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
        location:  form.location  || null,
        questions: form.questions || null,
        notes:     form.notes     || null,
        followup_for_id: null,
      };
      if (editTarget) await updateAppointment(supabase, editTarget.id, payload);
      else            await createAppointment(supabase, payload);
      router.refresh();   // causes server re-render → useEffect syncs local state
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
        <div style={{ marginBottom: 16 }}>
          <Button variant="accent" onClick={openNew}>+ New Appointment</Button>
        </div>
      )}

      <div className="section-divider">Upcoming ({localUpcoming.length})</div>
      {localUpcoming.length === 0
        ? <p className="empty-state">No upcoming appointments.</p>
        : localUpcoming.map(a => <ApptRow key={a.id} appt={a} onEdit={() => openEdit(a)} />)
      }

      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          onClick={() => setShowPast(s => !s)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '0.78rem', padding: '4px 0' }}
        >
          {showPast ? '▲ Hide' : '▼ Show'} past appointments ({localPast.length})
        </button>

        {showPast && (
          <div style={{ marginTop: 8 }}>
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
