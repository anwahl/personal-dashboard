'use client';

/**
 * components/medications/PrescriptionDetailClient.tsx
 *
 * Detail page for a single prescription — shows current field values
 * and the full RxChangeHistory log.
 */

import { useState, useCallback }             from 'react';
import { useRouter }                          from 'next/navigation';
import { applyPrescriptionChanges, updatePrescription } from '@/lib/dal/prescriptions';
import { deletePrescriptionChange }           from '@/lib/dal/appointments';
import { createClient }                       from '@/lib/supabase/client';
import { Button, Card, CardActions, CardBody, CardGrid, CardGridColumn, CardHeader, CardSection,
  CardSectionLabel, CardTitle, ConfirmButton, Field, FieldActions, FieldGrid,
  Item, SaveState, SaveStatus } from '@/components/ui';
import type { PrescriptionDetail }            from '@/types/dal';
import type {
  PrescriptionChangeRow, MedicationTimingTypeRow,
  MedicationRow, PersonRow, ProviderRow,
} from '@/types/schema';
import { RX_FIELDS, RxFieldKey, getRxDisplayValue } from '@/lib/constants/prescriptions';
import { RxPendingChanges }  from './RxPendingChanges';
import { PrescriptionForm, PrescriptionFormValues, rxToFormValues } from './PrescriptionForm';
import Link from 'next/link';


interface Props {
  prescription:    PrescriptionDetail;
  initialHistory:  PrescriptionChangeRow[];
  timings:         MedicationTimingTypeRow[];
  /** Required for edit mode */
  medications:     MedicationRow[];
  people:          PersonRow[];
  providers:       ProviderRow[];
}

export function PrescriptionDetailClient({ prescription: rx, initialHistory, timings, medications, people, providers }: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [mode,      setMode]      = useState<'view' | 'edit'>('view');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [history,   setHistory]   = useState<PrescriptionChangeRow[]>(initialHistory);

  const handleSave = useCallback(async (values: PrescriptionFormValues) => {
    setSaveState('saving');
    try {
      await updatePrescription(supabase, rx.id, {
        alias:             values.alias             || null,
        dose:              values.dose              || null,
        timing_type_id:    values.timing_type_id   ? Number.parseInt(values.timing_type_id) : null,
        purpose:           values.purpose           || null,
        prescriber_id:     values.prescriber_id    ? Number.parseInt(values.prescriber_id)  : null,
        start_date:        values.start_date        || null,
        discontinued_date: values.discontinued_date || null,
        is_active:         !values.discontinued_date,
      });
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
      setMode('view');
      router.refresh();
    } catch { setSaveState('error'); }
  }, [supabase, rx.id, router]);

  const removeHistory = async (id: number) => {
    await deletePrescriptionChange(supabase, id);
    setHistory(h => h.filter(r => r.id !== id));
  };

  // ── Edit mode ───────────────────────────────────────────────────────────────

  if (mode === 'edit') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Prescription</CardTitle>
          <CardActions>
            <SaveStatus state={saveState} />
          </CardActions>
        </CardHeader>
        <PrescriptionForm
          initialValues={rxToFormValues(rx)}
          medications={medications}
          timingTypes={timings}
          people={people}
          providers={providers}
          saving={saveState === 'saving'}
          showPersonField={false}
          onSave={handleSave}
          onCancel={() => setMode('view')}
        />
      </Card>
    );
  }

  // ── View mode ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {rx.alias ?? rx.medication.medication_name}
          {!rx.is_active && <Item itemType='inactive' value='Discontinued' />}
        </CardTitle>
        <CardActions>
          <Button variant="ghost" size="sm" onClick={() => setMode('edit')}>✏️ Edit</Button>
          <Button href="/medications" variant="ghost" size="sm">← Medications</Button>
        </CardActions>
      </CardHeader>
      <CardBody>
        <CardSection>
          <CardSectionLabel>Details</CardSectionLabel>
          <FieldGrid>
            {RX_FIELDS.filter(f => f.key !== 'is_active').map(f => {
              const val = getRxDisplayValue(rx, f.key as RxFieldKey, timings);
              if (!val) return null;
              return (
                <Field key={f.key} label={f.label} value={val} />
              );
            })}
          </FieldGrid>
        </CardSection>
        <CardSection>
          <CardSectionLabel>Change History</CardSectionLabel>
          {history.length > 0 && (
            <>
              {history.map(h => (
                <span key={h.id}>
                    {h.appointment_id && (
                      <Item itemType='meta'
                        value = {
                          <Link href={`/appointments/${h.appointment_id}`} className="link__generic">
                            Appointment
                          </Link>
                        }
                      />
                    )}
                    <Item itemType='title' value={h.field_changed} />
                    <CardGrid columns={2}>
                      <CardGridColumn>
                        <CardGrid columns={3}>
                          {h.previous_value ? <Item itemType='info' value={h.previous_value} /> : <Item itemType='info' value='N/A' />}
                          {h.previous_value || h.new_value ? '→' : ''}
                          {h.new_value ? <Item itemType='info' value={h.new_value} /> : <Item itemType='info' value='N/A' />}
                        </CardGrid>
                      </CardGridColumn>
                      <CardGridColumn>
                        <FieldActions boxed={false} alignment='right'>
                          <ConfirmButton onConfirm={() => removeHistory(h.id)} size="sm">✕</ConfirmButton>
                        </FieldActions>
                      </CardGridColumn>
                    </CardGrid>
                </span>
              ))}
            </>
          )}
          {history.length === 0 && (
            <p className="expand-panel__empty">No changes logged yet.</p>
          )}

          <RxPendingChanges
            rx={rx}
            timings={timings}
            onApply={async entries => {
              const newRows = await applyPrescriptionChanges(supabase, rx.id, null, entries);
              setHistory(h => [...newRows, ...h]);
              router.refresh();
            }}
          />
        </CardSection>
      </CardBody>
    </Card>
  );
}