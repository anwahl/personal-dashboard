'use client';

/**
 * Detail page for a single prescription — shows current field values
 * and the full RxChangeHistory log.
 */

import { useState, useCallback, useEffect }   from 'react';
import { useRouter }                          from 'next/navigation';
import { applyPrescriptionChanges, updatePrescription } from '@/lib/dal/prescriptions';
import { deletePrescriptionChange }           from '@/lib/dal/appointments';
import { createClient }                       from '@/lib/supabase/client';
import { Button, Card, CardActions, CardBody, CardHeader, CardSection,
  CardSectionLabel, CardTitle, Field, FieldGrid,
  Item, SaveState, SaveStatus, useToast } from '@/components/ui';
import type { PrescriptionDetail }            from '@/types/dal';
import type { PrescriptionChangeRow }         from '@/types/schema';
import { RX_FIELDS, RxFieldKey, getRxDisplayValue } from '@/lib/constants/prescriptions';
import { getRxChangesByRx, useMedicationTimingTypes }           from '@/lib/hooks/reference';
import { RxPendingChanges }  from './RxPendingChanges';
import { PrescriptionForm, PrescriptionFormValues, rxToFormValues } from './PrescriptionForm';
import Link from 'next/link';
import { PrescriptionChangeDisplayRow } from './PrescriptionChangeDisplayRow';


interface Props {
  prescription:   PrescriptionDetail;
  //initialHistory: PrescriptionChangeRow[];
}

export function PrescriptionDetailClient({ prescription }: Readonly<{prescription:   PrescriptionDetail;}>) {
  const { data: timings = [], isLoading: timingsLoading, error: timingsError } = useMedicationTimingTypes();
  const { data: initialHistory = [], isLoading: historyLoading, error: changesError } = getRxChangesByRx(prescription.id);
  
  const { addToast } = useToast();
  useEffect(() => { if (timingsError) addToast('Failed to load timing types', 'error'); }, [timingsError, addToast]);
  useEffect(() => { if (changesError) addToast('Failed to load prescription history', 'error'); }, [changesError, addToast]);
  
  const isLoading = timingsLoading || historyLoading;

  const supabase = createClient();
  const router   = useRouter();

  const [mode,      setMode]      = useState<'view' | 'edit'>('view');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [history,   setHistory]   = useState<PrescriptionChangeRow[]>(initialHistory);

  const handleSave = useCallback(async (values: PrescriptionFormValues) => {
    if(isLoading || !prescription) return;
    setSaveState('saving');
    try {
      await updatePrescription(supabase, prescription.id, {
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
  }, [supabase, prescription, router]);

  const removeHistory = async (id: number) => {
    await deletePrescriptionChange(supabase, id);
    setHistory(h => h.filter(r => r.id !== id));
  };

  if(!prescription) return;

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
          initialValues={rxToFormValues(prescription)}
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
          {prescription.alias ?? prescription.medication.medication_name}
          {!prescription.is_active && <Item itemType='inactive' value='Discontinued' />}
        </CardTitle>
        <CardActions>
          <Button variant="ghost" size="sm" onClick={() => setMode('edit')}>✏️ Edit</Button>
        </CardActions>
      </CardHeader>
      <CardBody>
        <CardSection>
          <CardSectionLabel>Details</CardSectionLabel>
          <FieldGrid>
            {RX_FIELDS.filter(f => f.key !== 'is_active').map(f => {
              const val = getRxDisplayValue(prescription, f.key as RxFieldKey, timings);
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
                  <PrescriptionChangeDisplayRow key={h.id} h={h} onRemove={removeHistory} />
                </span>
              ))}
            </>
          )}
          {history.length === 0 && (
            <Item itemType='info' value='No changes logged for this prescription.' />
          )}

          <RxPendingChanges
            rx={prescription}
            onApply={async entries => {
              const newRows = await applyPrescriptionChanges(supabase, prescription.id, null, entries);
              setHistory(h => [...newRows, ...h]);
              router.refresh();
            }}
          />
        </CardSection>
      </CardBody>
    </Card>
  );
}