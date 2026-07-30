'use client';

/**
 * components/medications/PrescriptionDetailClient.tsx
 *
 * Detail page for a single prescription — shows current field values
 * and the full RxChangeHistory log.
 */

import { useState, useCallback }             from 'react';
import { useRouter }                          from 'next/navigation';
import { applyPrescriptionChanges, getPrescriptionChangesByRx } from '@/lib/dal/prescriptions';
import type { FieldChangeEntry }              from '@/lib/dal/prescriptions';
import { deletePrescriptionChange }           from '@/lib/dal/appointments';
import { createClient }                       from '@/lib/supabase/client';
import { Button, ConfirmButton }              from '@/components/ui';
import { formatMediumDate }                   from '@/lib/utils/dates';
import type { PrescriptionDetail }            from '@/types/dal';
import type { PrescriptionChangeRow, MedicationTimingTypeRow } from '@/types/schema';

// ── Field definitions (source of truth: these are the prescription columns) ──
// Kept here in the prescription detail context — matches appointment changes logic
export const RX_FIELDS = [
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
  uid:           string;
  fieldKey:      RxFieldKey;
  fieldLabel:    string;
  previousValue: string;
  newValue:      string;
  newTimingId:   string;
}

function getRxDisplayValue(rx: PrescriptionDetail, key: RxFieldKey, timings: MedicationTimingTypeRow[]): string {
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

interface Props {
  prescription: PrescriptionDetail;
  initialHistory: PrescriptionChangeRow[];
  timings: MedicationTimingTypeRow[];
}

export function PrescriptionDetailClient({ prescription: rx, initialHistory, timings }: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [history,       setHistory]       = useState<PrescriptionChangeRow[]>(initialHistory);
  const [pending,       setPending]       = useState<PendingChange[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [selectedField, setSelectedField] = useState('');

  const addField = (key: RxFieldKey) => {
    const def  = RX_FIELDS.find(f => f.key === key)!;
    const prev = getRxDisplayValue(rx, key, timings);
    setPending(p => [...p, {
      uid:           `${key}-${Date.now()}`,
      fieldKey:      key,
      fieldLabel:    def.label,
      previousValue: prev,
      newValue:      key === 'is_active' ? (rx.is_active ? 'Discontinued' : 'Active') : prev,
      newTimingId:   key === 'timing_type_id' ? String(rx.timing_type_id ?? '') : '',
    }]);
    setSelectedField('');
  };

  const updatePending = (uid: string, patch: Partial<PendingChange>) =>
    setPending(p => p.map(c => c.uid === uid ? { ...c, ...patch } : c));

  const apply = useCallback(async () => {
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
  }, [supabase, rx.id, pending, saving, timings, router]);

  const removeHistory = async (id: number) => {
    await deletePrescriptionChange(supabase, id);
    setHistory(h => h.filter(r => r.id !== id));
  };

  const availableFields = RX_FIELDS.filter(f => !pending.some(c => c.fieldKey === f.key));

  return (
    <div>
      {/* ── Current values ─────────────────────────────────────────────── */}
      <div className="detail-page__header">
        <h2 className="detail-page__title">
          {rx.alias ?? rx.medication.medication_name}
          {!rx.is_active && <span className="badge badge--muted" style={{ marginLeft: 8 }}>Discontinued</span>}
        </h2>
        <Button href="/medications" variant="ghost" size="sm">← Medications</Button>
      </div>

      <dl className="detail-page__fields">
        {RX_FIELDS.filter(f => f.key !== 'is_active').map(f => {
          const val = getRxDisplayValue(rx, f.key as RxFieldKey, timings);
          if (!val) return null;
          return (
            <div key={f.key} className="detail-page__field">
              <dt>{f.label}</dt>
              <dd>{val}</dd>
            </div>
          );
        })}
      </dl>

      {/* ── Change history ─────────────────────────────────────────────── */}
      <div className="settings-section" style={{ marginTop: 24 }}>
        <div className="settings-section__header">
          <span className="settings-section__title">Change History</span>
        </div>

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

        {/* Log a new change */}
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
              <select className="settings-select" value={c.newTimingId}
                onChange={e => updatePending(c.uid, { newTimingId: e.target.value })}>
                <option value="">Select timing…</option>
                {timings.map(t => <option key={t.id} value={t.id}>{t.timing_name}</option>)}
              </select>
            ) : c.fieldKey === 'is_active' ? (
              <select className="settings-select" value={c.newValue}
                onChange={e => updatePending(c.uid, { newValue: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Discontinued">Discontinued</option>
              </select>
            ) : (
              <input className="input--flex" value={c.newValue}
                onChange={e => updatePending(c.uid, { newValue: e.target.value })} />
            )}
            <Button size="icon" variant="ghost" onClick={() => setPending(p => p.filter(x => x.uid !== c.uid))}>✕</Button>
          </div>
        ))}

        {pending.length > 0 && (
          <Button variant="accent" size="sm" onClick={apply} disabled={saving}>
            {saving ? 'Saving…' : `Apply ${pending.length} change${pending.length > 1 ? 's' : ''}`}
          </Button>
        )}
      </div>
    </div>
  );
}
