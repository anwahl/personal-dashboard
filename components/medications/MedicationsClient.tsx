'use client';

import { useState, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button }                from '@/components/ui/Button';
import { InputField }            from '@/components/ui/Display';
import type { PrescriptionDetail } from '@/types/dal';
import type { PersonRow, MedicationRow, MedicationTimingTypeRow, ProviderRow } from '@/types/schema';

interface PrescriptionsByPerson {
  person:        PersonRow;
  prescriptions: PrescriptionDetail[];
}

interface Props {
  prescriptionsByPerson: PrescriptionsByPerson[];
  medications:           MedicationRow[];
  timingTypes:           MedicationTimingTypeRow[];
  people:                PersonRow[];
  providers:             ProviderRow[];
}

interface FormState {
  person_id:          string;
  medication_id:      string;
  new_medication_name:string;    // if creating new medication
  alias:              string;
  dose:               string;
  timing_type_id:     string;
  purpose:            string;
  prescriber_id:      string;
  start_date:         string;
  discontinued_date:  string;
}

const EMPTY_FORM: FormState = {
  person_id: '', medication_id: '', new_medication_name: '',
  alias: '', dose: '', timing_type_id: '', purpose: '',
  prescriber_id: '', start_date: '', discontinued_date: '',
};

function RxItem({ rx, onEdit }: Readonly<{ rx: PrescriptionDetail; onEdit: () => void }>) {
  const isActive = !rx.discontinued_date;
  return (
    <div className={`list-item${isActive ? '' : ' list-item--muted'}`} onClick={onEdit}>
      <div className="list-item__body">
        <div className="list-item__title">
          {rx.alias ?? rx.medication.medication_name}
          {rx.dose ? ` · ${rx.dose}` : ''}
        </div>
        <div className="list-item__meta">
          {rx.timing_type && <span>{rx.timing_type.timing_name}</span>}
          {rx.purpose && <span>{rx.purpose}</span>}
          {rx.prescriber && <span>Rx: {rx.prescriber.provider_name ?? rx.prescriber.practice_name}</span>}
          {!isActive && <span style={{ color: 'var(--danger)' }}>Discontinued</span>}
        </div>
        {rx.latest_refill?.refill_due_date && (
          <div className="list-item__meta" style={{ marginTop: 4 }}>
            <span>Refill due: {rx.latest_refill.refill_due_date}</span>
          </div>
        )}
      </div>
      {isActive && <span className="badge badge--success">Active</span>}
    </div>
  );
}

export function MedicationsClient({ prescriptionsByPerson, medications, timingTypes, people, providers }: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();
  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState<PrescriptionDetail | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [useNewMed,  setUseNewMed]  = useState(false);

  const set = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const openNew  = (personId?: number) => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, person_id: personId ? String(personId) : '' });
    setUseNewMed(false);
    setShowForm(true);
  };

  const openEdit = (rx: PrescriptionDetail) => {
    setEditTarget(rx);
    setForm({
      person_id:           String(rx.person_id),
      medication_id:       String(rx.medication_id),
      new_medication_name: '',
      alias:               rx.alias             ?? '',
      dose:                rx.dose              ?? '',
      timing_type_id:      rx.timing_type_id   ? String(rx.timing_type_id)   : '',
      purpose:             rx.purpose           ?? '',
      prescriber_id:       rx.prescriber_id    ? String(rx.prescriber_id)    : '',
      start_date:          rx.start_date        ?? '',
      discontinued_date:   rx.discontinued_date ?? '',
    });
    setUseNewMed(false);
    setShowForm(true);
  };

  const cancel = () => { setShowForm(false); setEditTarget(null); };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      let medId = form.medication_id ? Number.parseInt(form.medication_id) : null;

      // Create new medication if needed
      if (useNewMed && form.new_medication_name.trim()) {
        const { data: newMed } = await supabase
          .from('medications')
          .insert({ medication_name: form.new_medication_name.trim() })
          .select('id')
          .single();
        if (newMed) medId = newMed.id;
      }

      if (!medId || !form.person_id) return;

      const payload = {
        person_id:         Number.parseInt(form.person_id),
        medication_id:     medId,
        alias:             form.alias             || null,
        dose:              form.dose              || null,
        timing_type_id:    form.timing_type_id   ? Number.parseInt(form.timing_type_id)   : null,
        purpose:           form.purpose           || null,
        prescriber_id:     form.prescriber_id    ? Number.parseInt(form.prescriber_id)    : null,
        start_date:        form.start_date        || null,
        discontinued_date: form.discontinued_date || null,
        is_active:         !form.discontinued_date,
      };

      if (editTarget) {
        await supabase.from('prescriptions').update(payload).eq('id', editTarget.id);
      } else {
        await supabase.from('prescriptions').insert(payload);
      }

      router.refresh();
      cancel();
    } finally {
      setSaving(false);
    }
  }, [supabase, form, editTarget, useNewMed, router]);

  if (showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{editTarget ? 'Edit Prescription' : 'Add Prescription'}</CardTitle>
        </CardHeader>
        <CardBody>
          <InputField label="Person" id="rx-person">
            <select id="rx-person" value={form.person_id} onChange={e => set('person_id', e.target.value)}>
              <option value="">Select person…</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.person_name}</option>)}
            </select>
          </InputField>

          {/* Medication — pick existing or create new */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <Button size="sm" variant={!useNewMed ? 'accent' : 'ghost'} onClick={() => setUseNewMed(false)}>Existing</Button>
              <Button size="sm" variant={useNewMed  ? 'accent' : 'ghost'} onClick={() => setUseNewMed(true)}>New medication</Button>
            </div>
            {useNewMed ? (
              <InputField label="Medication name" id="rx-new-med">
                <input id="rx-new-med" type="text" value={form.new_medication_name} onChange={e => set('new_medication_name', e.target.value)} placeholder="e.g. Duloxetine" />
              </InputField>
            ) : (
              <InputField label="Medication" id="rx-med-id">
                <select id="rx-med-id" value={form.medication_id} onChange={e => set('medication_id', e.target.value)}>
                  <option value="">Select medication…</option>
                  {medications.map(m => <option key={m.id} value={m.id}>{m.medication_name}{m.generic_name ? ` (${m.generic_name})` : ''}</option>)}
                </select>
              </InputField>
            )}
          </div>

          <InputField label="Display name / alias" id="rx-alias">
            <input id="rx-alias" type="text" value={form.alias} onChange={e => set('alias', e.target.value)} placeholder="e.g. Duloxetine 20mg" />
          </InputField>

          <div className="field-grid">
            <InputField label="Dose" id="rx-dose">
              <input id="rx-dose" type="text" value={form.dose} onChange={e => set('dose', e.target.value)} placeholder="e.g. 20mg" />
            </InputField>
            <InputField label="Timing" id="rx-timing">
              <select id="rx-timing" value={form.timing_type_id} onChange={e => set('timing_type_id', e.target.value)}>
                <option value="">Select timing…</option>
                {timingTypes.map(t => <option key={t.id} value={t.id}>{t.timing_name}</option>)}
              </select>
            </InputField>
          </div>

          <InputField label="Purpose" id="rx-purpose">
            <input id="rx-purpose" type="text" value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="What it's for…" />
          </InputField>

          <InputField label="Prescriber" id="rx-prescriber">
            <select id="rx-prescriber" value={form.prescriber_id} onChange={e => set('prescriber_id', e.target.value)}>
              <option value="">No prescriber linked</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.provider_name ?? p.practice_name}</option>)}
            </select>
          </InputField>

          <div className="field-grid">
            <InputField label="Start date" id="rx-start">
              <input id="rx-start" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </InputField>
            <InputField label="Discontinued date" id="rx-disc">
              <input id="rx-disc" type="date" value={form.discontinued_date} onChange={e => set('discontinued_date', e.target.value)} />
            </InputField>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="accent" onClick={save} disabled={saving || (!form.medication_id && !form.new_medication_name) || !form.person_id}>
              {saving ? 'Saving…' : editTarget ? 'Update' : 'Add'}
            </Button>
            <Button variant="ghost" onClick={cancel}>Cancel</Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button variant="accent" onClick={() => openNew()}>+ Add Prescription</Button>
      </div>

      {prescriptionsByPerson.map(({ person, prescriptions }) => {
        const active = prescriptions.filter(rx => rx.is_active);
        const disc   = prescriptions.filter(rx => !rx.is_active);
        if (prescriptions.length === 0) return null;
        return (
          <div key={person.id} style={{ marginBottom: 24 }}>
            <div className="section-divider">
              {person.person_name}
              <Button size="sm" variant="ghost" onClick={() => openNew(person.id)} style={{ marginLeft: 8 }}>+ Add</Button>
            </div>
            {active.map(rx => <RxItem key={rx.id} rx={rx} onEdit={() => openEdit(rx)} />)}
            {disc.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: '0.78rem', color: 'var(--text-faint)', cursor: 'pointer', padding: '4px 0' }}>
                  {disc.length} discontinued
                </summary>
                {disc.map(rx => <RxItem key={rx.id} rx={rx} onEdit={() => openEdit(rx)} />)}
              </details>
            )}
          </div>
        );
      })}

      {prescriptionsByPerson.every(({ prescriptions }) => prescriptions.length === 0) && (
        <p className="empty-state">No prescriptions yet. Add one above.</p>
      )}
    </div>
  );
}
