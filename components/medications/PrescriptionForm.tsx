'use client';

/**
 * Shared form used by PrescriptionsClient (add/edit from the list page) and
 * PrescriptionDetailClient (edit mode on the detail page).
 *
 * Owns form state + the useNewMed toggle internally.
 * Fetches its own reference data via SWR hooks — callers no longer need to
 * fetch or pass medications, timingTypes, people, or providers.
 * Calls onSave(values) on submit — the parent handles the async DB write,
 * including creating a new Medication row if values.new_medication_name is set.
 */

import { useState, useEffect } from 'react';
import {
  Button, CardBody, CardActions, TextField, DateField, SelectField,
  CardSection, CardSectionLabel, FieldActions, FieldGrid,
  useToast,
} from '@/components/ui';
import {
  useMedications,
  useMedicationTimingTypes,
  usePeople,
  useProviders,
} from '@/lib/hooks/reference';
import type { PrescriptionDetail } from '@/types/dal';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PrescriptionFormValues {
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

export const emptyPrescriptionFormValues: PrescriptionFormValues = {
  person_id: '', medication_id: '', new_medication_name: '',
  alias: '', dose: '', timing_type_id: '', purpose: '',
  prescriber_id: '', start_date: '', discontinued_date: '',
};

export function rxToFormValues(rx: PrescriptionDetail): PrescriptionFormValues {
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

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  initialValues:    PrescriptionFormValues;
  saving:           boolean;
  saveLabel?:       string;
  showPersonField?: boolean;
  onSave:           (values: PrescriptionFormValues) => void;
  onCancel:         () => void;
}

export function PrescriptionForm({
  initialValues,
  saving, saveLabel = 'Save',
  showPersonField = true,
  onSave, onCancel,
}: Readonly<Props>) {
  const [form,      setForm]      = useState<PrescriptionFormValues>(initialValues);
  const [useNewMed, setUseNewMed] = useState(false);

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
  const canSave   = hasMed && hasPerson;

  const referenceLoading = medsLoading || timingsLoading || (showPersonField && peopleLoading) || providersLoading;

  return (
    <CardBody>
      {showPersonField && (
        <SelectField label="Person" value={form.person_id} onChange={v => set('person_id', v)}
          disabled={peopleLoading} placeholder={peopleLoading ? 'Loading…' : 'Select person…'}
          options={people.map(p => ({ value: p.id, label: p.person_name }))} />
      )}

      <FieldActions alignment="middle">
        <Button size="sm" variant={!useNewMed ? 'accent' : 'ghost'}
          onClick={() => setUseNewMed(false)}>
          Existing
        </Button>
        <Button size="sm" variant={useNewMed ? 'accent' : 'ghost'}
          onClick={() => setUseNewMed(true)}>
          New medication
        </Button>
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

      <CardActions>
        <Button variant="accent" onClick={() => onSave(form)}
          disabled={saving || !canSave || referenceLoading}>
          {saving ? 'Saving…' : saveLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </CardActions>
    </CardBody>
  );
}
