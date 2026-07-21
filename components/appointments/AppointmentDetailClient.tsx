'use client';

import { useState, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/client';
import { updateAppointment, deleteAppointment } from '@/lib/dal/appointments';
import { Button }                from '@/components/ui/Button';
import { ConfirmButton }         from '@/components/ui/ConfirmButton';
import { InputField }            from '@/components/ui/Display';
import { SaveStatus }            from '@/components/ui/Display';
import type { SaveState }        from '@/components/ui/Display';
import type { AppointmentDetail }    from '@/types/dal';
import type { AppointmentTypeRow, PersonRow, ProviderRow } from '@/types/schema';

interface Props {
  appointment:      AppointmentDetail;
  appointmentTypes: AppointmentTypeRow[];
  people:           PersonRow[];
  providers:        ProviderRow[];
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function fmtTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function daysUntil(d: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [y, m, day] = d.split('-').map(Number);
  const diff = Math.round((new Date(y, m - 1, day).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0)  return `${Math.abs(diff)} days ago`;
  return `In ${diff} days`;
}

export function AppointmentDetailClient({ appointment: appt, appointmentTypes, people, providers }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [mode,       setMode]       = useState<'view' | 'edit'>('view');
  const [saveState,  setSaveState]  = useState<SaveState>('idle');

  const [date,    setDate]    = useState(appt.appointment_date);
  const [time,    setTime]    = useState(appt.appointment_time ?? '');
  const [typeId,  setTypeId]  = useState(appt.appointment_type_id ? String(appt.appointment_type_id) : '');
  const [personId,setPersonId]= useState(String(appt.person_id));
  const [provId,  setProvId]  = useState(appt.provider_id ? String(appt.provider_id) : '');
  const [location,setLocation]= useState(appt.location ?? '');
  const [questions,setQs]     = useState(appt.questions ?? '');
  const [notes,   setNotes]   = useState(appt.notes ?? '');

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      await updateAppointment(supabase, appt.id, {
        appointment_date:    date,
        appointment_time:    time || null,
        appointment_type_id: typeId   ? parseInt(typeId)   : null,
        person_id:           parseInt(personId),
        provider_id:         provId   ? parseInt(provId)   : null,
        location:            location || null,
        questions:           questions || null,
        notes:               notes     || null,
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

  if (mode === 'view') {
    const countdown = daysUntil(appt.appointment_date);
    const isPast    = appt.appointment_date < new Date().toISOString().slice(0, 10);

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
            <dd>{fmtDate(appt.appointment_date)}{fmtTime(appt.appointment_time) ? ` at ${fmtTime(appt.appointment_time)}` : ''}</dd>
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
        <textarea id="ad-q" value={questions} onChange={e => setQs(e.target.value)} />
      </InputField>

      <InputField label="Notes" id="ad-notes">
        <textarea id="ad-notes" value={notes} onChange={e => setNotes(e.target.value)} />
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
