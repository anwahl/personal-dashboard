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

import { useState, useCallback, useEffect } from 'react';
import { Button, CardGridRow, FieldActions, Item, useToast, SelectField, DateField, TextField } from '@/components/ui';
import {
  RX_FIELDS, RxFieldKey,
  PendingChange, getRxDisplayValue,
}                                     from '@/lib/constants/prescriptions';
import type { FieldChangeEntry }      from '@/lib/dal/prescriptions';
import type { PrescriptionDetail }    from '@/types/dal';
import { useMedicationTimingTypes }   from '@/lib/hooks/reference';

interface Props {
  rx:      PrescriptionDetail;
  /**
   * Called with the built entries when the user clicks Apply.
   * The component clears its pending state after this resolves successfully.
   */
  onApply: (entries: FieldChangeEntry[]) => Promise<void>;
}

export function RxPendingChanges({ rx, onApply }: Readonly<Props>) {
  const { data: timings = [], error: timingsError } = useMedicationTimingTypes();
  const { addToast } = useToast();
  const [pending,       setPending]       = useState<PendingChange[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [selectedField, setSelectedField] = useState('');
  useEffect(() => {
    if (timingsError)
      addToast('Failed to load timing types', 'error');
  }, [timingsError, addToast]);

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
        <SelectField label="Field to change" value={selectedField}
          onChange={v => {
            if (v) addField(v as RxFieldKey);
            setSelectedField(v);
          }}
          placeholder="+ Log a field change…"
          options={availableFields.map(f => ({ value: f.key, label: f.label }))} />
      )}
      
        {pending.map(c => (
            <CardGridRow key={c.uid} >
              <Item itemType='title' value={c.fieldLabel} />
              <Item itemType='info' value={c.previousValue || '—'} />
              <Item itemType='info' value='→' />
              {c.fieldKey === 'timing_type_id' ? (
                <SelectField hideLabel label={`New ${c.fieldLabel}`} className="field" value={c.newTimingId}
                  onChange={v => updatePending(c.uid, { newTimingId: v })}
                  placeholder="No timing"
                  options={timings.map(t => ({ value: t.id, label: t.timing_name }))} />
              ) : c.fieldKey === 'is_active' ? (
                <SelectField hideLabel label={`New ${c.fieldLabel}`} className="field" value={c.newValue}
                  onChange={v => updatePending(c.uid, { newValue: v })}
                  options={[{ value: 'Active', label: 'Active' }, { value: 'Discontinued', label: 'Discontinued' }]} />
              ) : c.fieldKey.endsWith('_date') ? (
                <DateField hideLabel label={`New ${c.fieldLabel}`} className="field" value={c.newValue}
                  onChange={v => updatePending(c.uid, { newValue: v })} />
              ) : (
                <TextField hideLabel label={`New ${c.fieldLabel}`} className="field" value={c.newValue}
                  onChange={v => updatePending(c.uid, { newValue: v })} placeholder="New value…" />
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