'use client';

import { useState, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { updatePrescription, createPrescription } from '@/lib/dal/medications';
import { applyPrescriptionChanges, getPrescriptionChangesByRx } from '@/lib/dal/prescriptions';
import type { FieldChangeEntry } from '@/lib/dal/prescriptions';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { deletePrescriptionChange } from '@/lib/dal/appointments';
import type { PrescriptionChangeRow, MedicationTimingTypeRow as _TimingType } from '@/types/schema';
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

interface PendingChange {
  uid: string; fieldKey: RxFieldKey; fieldLabel: string;
  previousValue: string; newValue: string; newTimingId: string;
}

function getRxPrev(rx: PrescriptionDetail, key: RxFieldKey, timings: MedicationTimingTypeRow[]): string {
  switch (key) {
    case 'dose':              return rx.dose              ?? '';
    case 'timing_type_id':    return timings.find(t => t.id === rx.timing_type_id)?.timing_name ?? '';
    case 'purpose':           return rx.purpose           ?? '';
    case 'alias':             return rx.alias             ?? '';
    case 'start_date':        return rx.start_date        ?? '';
    case 'discontinued_date': return rx.discontinued_date ?? '';
    case 'is_active':         return rx.is_active ? 'Active' : 'Discontinued';
    default:                  return '';
  }
}

function RxChangeHistory({ rx, timings }: Readonly<{
  rx:      PrescriptionDetail;
  timings: MedicationTimingTypeRow[];
}>) {
  const supabase  = createClient();
  const router    = useRouter();
  const [open,    setOpen]    = useState(false);
  const [history, setHistory] = useState<PrescriptionChangeRow[]>([]);
  const [loaded,  setLoaded]  = useState(false);
  const [pending, setPending] = useState<PendingChange[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [selectedField, setSelectedField] = useState('');

  const load = useCallback(async () => {
    setHistory(await getPrescriptionChangesByRx(supabase, rx.id));
    setLoaded(true);
  }, [supabase, rx.id]);

  const toggle = async () => {
    if (!open && !loaded) await load();
    setOpen(o => !o);
  };

  const addField = (key: RxFieldKey) => {
    const def  = RX_FIELDS.find(f => f.key === key)!;
    const prev = getRxPrev(rx, key, timings);
    setPending(p => [...p, {
      uid: `${key}-${Date.now()}`, fieldKey: key, fieldLabel: def.label,
      previousValue: prev,
      newValue:  key === 'is_active' ? (rx.is_active ? 'Discontinued' : 'Active') : prev,
      newTimingId: key === 'timing_type_id' ? String(rx.timing_type_id ?? '') : '',
    }]);
    setSelectedField('');
  };

  const updatePending = (uid: string, patch: Partial<PendingChange>) =>
    setPending(p => p.map(c => c.uid === uid ? { ...c, ...patch } : c));

  const apply = async () => {
    if (pending.length === 0 || saving) return;
    setSaving(true);
    try {
      const entries: FieldChangeEntry[] = pending.map(c => {
        let rawValue: unknown;
        if (c.fieldKey === 'timing_type_id') rawValue = c.newTimingId ? Number.parseInt(c.newTimingId) : null;
        else if (c.fieldKey === 'is_active') rawValue = c.newValue === 'Active';
        else rawValue = c.newValue || null;
        return {
          fieldKey: c.fieldKey, fieldLabel: c.fieldLabel,
          previousValue: c.previousValue,
          newValue: c.fieldKey === 'timing_type_id'
            ? (timings.find(t => String(t.id) === c.newTimingId)?.timing_name ?? c.newTimingId)
            : c.newValue,
          rawValue,
        };
      });
      const newRows = await applyPrescriptionChanges(supabase, rx.id, null, entries);
      setHistory(h => [...newRows, ...h]);
      setPending([]);
      router.refresh();
    } finally { setSaving(false); }
  };

  const removeHistory = async (id: number) => {
    await deletePrescriptionChange(supabase, id);
    setHistory(h => h.filter(r => r.id !== id));
  };

  const availableFields = RX_FIELDS.filter(f => !pending.some(c => c.fieldKey === f.key));

  return (
    <div className="rx-change-history">
      <button type="button" className="toggle-btn" onClick={toggle}>
        History / Log Change {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="rx-change-history__body">
          {history.length > 0 && (
            <div className="appt-section__history">
              {history.map(h => (
                <div key={h.id} className="manage-item">
                  <span className="manage-item__name">
                    {h.field_changed}
                    {(h.previous_value || h.new_value) && (
                      <span className="manage-item__meta">
                        {h.previous_value ? ` ${h.previous_value}` : ''}
                        {h.previous_value && h.new_value ? ' →' : ''}
                        {h.new_value ? ` ${h.new_value}` : ''}
                      </span>
                    )}
                    {h.appointment_id && (
                      <span className="manage-item__meta">
                        {' · '}<a href={`/appointments/${h.appointment_id}`} className="text-link">appt</a>
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
            <p className="expand-panel__empty">No changes logged yet.</p>
          )}

          {/* Add field changes */}
          {availableFields.length > 0 && (
            <select className="settings-select" value={selectedField}
              onChange={e => { if (e.target.value) addField(e.target.value as RxFieldKey); setSelectedField(e.target.value); }}>
              <option value="">+ Log a field change…</option>
              {availableFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          )}

          {pending.map(c => (
            <div key={c.uid} className="rx-field-change-row">
              <span className="rx-field-change-row__label">{c.fieldLabel}</span>
              <span className="rx-field-change-row__prev">{c.previousValue || '—'}</span>
              <span className="rx-field-change-row__arrow">→</span>
              {c.fieldKey === 'timing_type_id' ? (
                <select className="rx-field-change-row__input" value={c.newTimingId}
                  onChange={e => updatePending(c.uid, { newTimingId: e.target.value })}>
                  <option value="">No timing</option>
                  {timings.map(t => <option key={t.id} value={t.id}>{t.timing_name}</option>)}
                </select>
              ) : c.fieldKey === 'is_active' ? (
                <select className="rx-field-change-row__input" value={c.newValue}
                  onChange={e => updatePending(c.uid, { newValue: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              ) : (
                <input type={c.fieldKey.endsWith('_date') ? 'date' : 'text'}
                  className="rx-field-change-row__input" value={c.newValue} placeholder="New value…"
                  onChange={e => updatePending(c.uid, { newValue: e.target.value })} />
              )}
              <button type="button" className="icon-btn" onClick={() => setPending(p => p.filter(x => x.uid !== c.uid))}>✕</button>
            </div>
          ))}

          {pending.length > 0 && (
            <div className="form-panel__actions" style={{ marginTop: 8 }}>
              <Button size="sm" variant="accent" onClick={apply} disabled={saving}>
                {saving ? 'Applying…' : `Apply ${pending.length} Change${pending.length > 1 ? 's' : ''}`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPending([])}>Cancel</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RxItem({ rx, timings, onEdit }: Readonly<{ rx: PrescriptionDetail; timings: MedicationTimingTypeRow[]; onEdit: () => void }>) {
  const isActive = !rx.discontinued_date;
  return (
    <>
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
      <RxChangeHistory rx={rx} timings={timings} />
    </>
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
        await updatePrescription(supabase, editTarget.id, payload);
      } else {
        await createPrescription(supabase, payload);
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
            {active.map(rx => <RxItem key={rx.id} rx={rx} timings={timingTypes} onEdit={() => openEdit(rx)} />)}
            {disc.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: '0.78rem', color: 'var(--text-faint)', cursor: 'pointer', padding: '4px 0' }}>
                  {disc.length} discontinued
                </summary>
                {disc.map(rx => <RxItem key={rx.id} rx={rx} timings={timingTypes} onEdit={() => openEdit(rx)} />)}
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
