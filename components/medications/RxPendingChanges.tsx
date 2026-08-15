'use client';

/**
 * components/medications/RxPendingChanges.tsx
 *
 * Shared UI for staging and applying prescription field changes.
 * Used by MedicationsClient (inside RxChangeHistory), PrescriptionDetailClient,
 * and AppointmentDetailClient (inside MedChangesSection).
 *
 * The component owns its pending-change state. The caller provides an `onApply`
 * callback that receives the built FieldChangeEntry[] and handles the actual
 * DB write + history update.
 */

import { useState, useCallback }     from 'react';
import { Button, CardGridRow, FieldActions, InputField, Item }                     from '@/components/ui';
import {
  RX_FIELDS, RxFieldKey,
  PendingChange, getRxDisplayValue,
}                                     from '@/lib/constants/prescriptions';
import type { FieldChangeEntry }      from '@/lib/dal/prescriptions';
import type { PrescriptionDetail }    from '@/types/dal';
import type { MedicationTimingTypeRow } from '@/types/schema';

interface Props {
  rx:      PrescriptionDetail;
  timings: MedicationTimingTypeRow[];
  /**
   * Called with the built entries when the user clicks Apply.
   * The component clears its pending state after this resolves successfully.
   */
  onApply: (entries: FieldChangeEntry[]) => Promise<void>;
}

export function RxPendingChanges({ rx, timings, onApply }: Readonly<Props>) {
  const [pending,       setPending]       = useState<PendingChange[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [selectedField, setSelectedField] = useState('');

  const availableFields = RX_FIELDS.filter(f => !pending.some(c => c.fieldKey === f.key));

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
        else if (c.fieldKey === 'is_active')  rawValue = c.newValue === 'Active';
        else                                  rawValue = c.newValue || null;
        return {
          fieldKey:      c.fieldKey,
          fieldLabel:    c.fieldLabel,
          previousValue: c.previousValue,
          newValue:      c.fieldKey === 'timing_type_id'
            ? (timings.find(t => String(t.id) === c.newTimingId)?.timing_name ?? c.newTimingId)
            : c.newValue,
          rawValue,
        };
      });
      await onApply(entries);
      setPending([]);
    } finally { setSaving(false); }
  }, [pending, saving, timings, onApply]);

  return (
    <>
      {availableFields.length > 0 && (
        <InputField id="rx-field-change" label='Field to Change'>
            <select id="rx-field-change" value={selectedField}
            onChange={e => {
                if (e.target.value) addField(e.target.value as RxFieldKey);
                setSelectedField(e.target.value);
            }}>
                <option value="">+ Log a field change…</option>
                {availableFields.map(f => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                ))}
            </select>
        </InputField>
      )}
      
        {pending.map(c => (
            <CardGridRow key={c.uid} >
              <Item itemType='title' value={c.fieldLabel} />
              <Item itemType='info' value={c.previousValue || '—'} />
              <Item itemType='info' value='→' />
              {c.fieldKey === 'timing_type_id' ? (
                <select className="field" value={c.newTimingId}
                  onChange={e => updatePending(c.uid, { newTimingId: e.target.value })}>
                  <option value="">No timing</option>
                  {timings.map(t => <option key={t.id} value={t.id}>{t.timing_name}</option>)}
                </select>
              ) : c.fieldKey === 'is_active' ? (
                <select className="field" value={c.newValue}
                  onChange={e => updatePending(c.uid, { newValue: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              ) : (
                <input
                  type={c.fieldKey.endsWith('_date') ? 'date' : 'text'}
                  className="field"
                  value={c.newValue}
                  onChange={e => updatePending(c.uid, { newValue: e.target.value })}
                  placeholder="New value…"
                />
              )}
              <FieldActions alignment='right'>
                <Button size="icon" variant="ghost"
                  onClick={() => setPending(p => p.filter(x => x.uid !== c.uid))}>
                  ✕
                </Button>
              </FieldActions>
            </CardGridRow>
        ))}

      {pending.length > 0 && (
        <FieldActions alignment='bottom'>
          <Button variant="accent" size="sm" onClick={apply} disabled={saving}>
            {saving ? 'Applying…' : `Apply ${pending.length} change${pending.length > 1 ? 's' : ''}`}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPending([])}>Cancel</Button>
        </FieldActions>
      )}
    </>
  );
}