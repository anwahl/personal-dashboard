'use client';

/**
 * PrescriptionDialog — add or edit a prescription (FormDialog). Used by the
 * Medications list (+ Add, Edit) and the prescription page (Edit).
 *
 * Fetches its own reference data (medications, timings, people, providers)
 * via SWR hooks, and does its own save.
 */

import { useState, useEffect } from 'react';
import { useRouter }           from 'next/navigation';
import {
  TextField, DateField, SelectField, FormDialog,
  CardSection, CardSectionLabel, FieldActions, FieldGrid,
  useToast, SegmentedControl
} from '@/components/ui';
import { createClient }        from '@/lib/supabase/client';
import { createPrescription, updatePrescription } from '@/lib/dal/prescriptions';
import { createMedication }    from '@/lib/dal/medications';
import {
  useMedications,
  useMedicationTimingTypes,
  usePeople,
  useProviders,
} from '@/lib/hooks/reference';
import type { PrescriptionDetail } from '@/types/dal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrescriptionFormValues {
  person_id:           string;
  medication_id:       string;
  new_medication_name: string;
  alias:               string;
  dose:                string;
  timing_type_id:      string;
  purpose:             string;
  prescriber_id:       string;
  start_date:          string;
  discontinued_date:   string;
}

const emptyPrescriptionFormValues: PrescriptionFormValues = {
  person_id: '', medication_id: '', new_medication_name: '',
  alias: '', dose: '', timing_type_id: '', purpose: '',
  prescriber_id: '', start_date: '', discontinued_date: '',
};

function rxToFormValues(rx: PrescriptionDetail): PrescriptionFormValues {
  return {
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
  };
}

// ── PrescriptionDialog ────────────────────────────────────────────────────────

/**
 * Add or edit a prescription in a FormDialog. With `prescription` it edits
 * it (the person can't change); without, it adds one, optionally for
 * `personId`. A medication typed under "New medication" is created first.
 * Saves itself and refreshes the page. Prescriptions are discontinued
 * (Discontinued date), never deleted.
 */
export function PrescriptionDialog({
  open, onOpenChange, prescription, personId,
}: Readonly<{
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  /** The prescription to edit; omit to add a new one. */
  prescription?: PrescriptionDetail | null;
  /** Person a new prescription is for (e.g. "+ Add" on their card). */
  personId?:     number;
}>) {
  const supabase = createClient();
  const router   = useRouter();
  const showPersonField = !prescription;
  const initialValues = prescription
    ? rxToFormValues(prescription)
    : { ...emptyPrescriptionFormValues, person_id: personId ? String(personId) : '' };

  const [form,      setForm]      = useState<PrescriptionFormValues>(initialValues);
  const [useNewMed, setUseNewMed] = useState(false);
  // Each open starts from the prescription (or blank) again.
  useEffect(() => {
    if (!open) return;
    setForm(initialValues);
    setUseNewMed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { data: medications = [], isLoading: medsLoading,     error: medsError }     = useMedications();
  const { data: timingTypes = [], isLoading: timingsLoading,  error: timingsError }  = useMedicationTimingTypes();
  const { data: people      = [], isLoading: peopleLoading,   error: peopleError }   = usePeople();
  const { data: providers   = [], isLoading: providersLoading, error: providersError } = useProviders();

  const { addToast } = useToast();

  // Surface any data-loading failures as toasts.
  useEffect(() => { if (medsError)      addToast('Failed to load medications', 'error'); }, [medsError,      addToast]);
  useEffect(() => { if (timingsError)   addToast('Failed to load timing types', 'error'); }, [timingsError,  addToast]);
  useEffect(() => { if (peopleError)    addToast('Failed to load people', 'error'); }, [peopleError,        addToast]);
  useEffect(() => { if (providersError) addToast('Failed to load providers', 'error'); }, [providersError,  addToast]);

  const set = (k: keyof PrescriptionFormValues, v: string) =>
    setForm(p => ({ ...p, [k]: v }));

  const hasMed    = useNewMed ? !!form.new_medication_name.trim() : !!form.medication_id;
  const hasPerson = !showPersonField || !!form.person_id;
  const referenceLoading = medsLoading || timingsLoading || (showPersonField && peopleLoading) || providersLoading;

  const save = async () => {
    const medicationId = useNewMed
      ? (await createMedication(supabase, form.new_medication_name)).id
      : Number.parseInt(form.medication_id);
    const payload = {
      medication_id:     medicationId,
      alias:             form.alias             || null,
      dose:              form.dose              || null,
      timing_type_id:    form.timing_type_id   ? Number.parseInt(form.timing_type_id) : null,
      purpose:           form.purpose           || null,
      prescriber_id:     form.prescriber_id    ? Number.parseInt(form.prescriber_id)  : null,
      start_date:        form.start_date        || null,
      discontinued_date: form.discontinued_date || null,
      is_active:         !form.discontinued_date,
    };
    if (prescription) await updatePrescription(supabase, prescription.id, payload);
    else              await createPrescription(supabase, { ...payload, person_id: Number.parseInt(form.person_id) });
    router.refresh();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={prescription ? 'Edit prescription' : 'Add prescription'}
      saveLabel={prescription ? 'Save' : 'Add'}
      canSave={hasMed && hasPerson && !referenceLoading}
      onSave={save}
    >
      {showPersonField && (
        <SelectField label="Person" value={form.person_id} onChange={v => set('person_id', v)}
          disabled={peopleLoading} placeholder={peopleLoading ? 'Loading…' : 'Select person…'}
          options={people.map(p => ({ value: p.id, label: p.person_name }))} />
      )}

      <FieldActions alignment="middle">
        <SegmentedControl
          label="Medication"
          options={[{ value: 'existing', label: 'Existing' }, { value: 'new', label: 'New medication' }]}
          value={useNewMed ? 'new' : 'existing'}
          onChange={v => setUseNewMed(v === 'new')}
        />
      </FieldActions>

      <CardSection>
        <CardSectionLabel>Medication Details</CardSectionLabel>

        {useNewMed ? (
          <TextField label="Medication name" value={form.new_medication_name}
            onChange={v => set('new_medication_name', v)} placeholder="e.g. Duloxetine" />
        ) : (
          <SelectField label="Medication" value={form.medication_id} onChange={v => set('medication_id', v)}
            disabled={medsLoading} placeholder={medsLoading ? 'Loading…' : 'Select medication…'}
            options={medications.map(m => ({
              value: m.id,
              label: `${m.medication_name}${m.generic_name ? ` (${m.generic_name})` : ''}`,
            }))} />
        )}

        <TextField label="Display name / alias" value={form.alias} onChange={v => set('alias', v)}
          placeholder="e.g. Duloxetine 20mg" />

        <FieldGrid>
          <TextField label="Dose" value={form.dose} onChange={v => set('dose', v)} placeholder="e.g. 20mg" />
          <SelectField label="Timing" value={form.timing_type_id} onChange={v => set('timing_type_id', v)}
            disabled={timingsLoading} placeholder={timingsLoading ? 'Loading…' : 'Select timing…'}
            options={timingTypes.map(t => ({ value: t.id, label: t.timing_name }))} />
        </FieldGrid>

        <TextField label="Purpose" value={form.purpose} onChange={v => set('purpose', v)}
          placeholder="What it's for…" />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Other Details</CardSectionLabel>

        <SelectField label="Prescriber" value={form.prescriber_id} onChange={v => set('prescriber_id', v)}
          disabled={providersLoading} placeholder={providersLoading ? 'Loading…' : 'No prescriber linked'}
          options={providers.map(p => ({ value: p.id, label: p.provider_name ?? p.practice_name ?? '' }))} />

        <FieldGrid>
          <DateField label="Start date" value={form.start_date} onChange={v => set('start_date', v)} />
          <DateField label="Discontinued date" value={form.discontinued_date}
            onChange={v => set('discontinued_date', v)} />
        </FieldGrid>
      </CardSection>
    </FormDialog>
  );
}
