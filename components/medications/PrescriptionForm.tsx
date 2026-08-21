'use client';

/**
 * components/medications/PrescriptionForm.tsx
 *
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
  Button, InputField, CardBody, CardActions,
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
        <InputField label="Person" id="rx-person">
          <select id="rx-person" value={form.person_id}
            onChange={e => set('person_id', e.target.value)}
            disabled={peopleLoading}>
            <option value="">{peopleLoading ? 'Loading…' : 'Select person…'}</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.person_name}</option>
            ))}
          </select>
        </InputField>
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
          <InputField label="Medication name" id="rx-new-med">
            <input id="rx-new-med" type="text" value={form.new_medication_name}
              onChange={e => set('new_medication_name', e.target.value)}
              placeholder="e.g. Duloxetine" />
          </InputField>
        ) : (
          <InputField label="Medication" id="rx-med-id">
            <select id="rx-med-id" value={form.medication_id}
              onChange={e => set('medication_id', e.target.value)}
              disabled={medsLoading}>
              <option value="">{medsLoading ? 'Loading…' : 'Select medication…'}</option>
              {medications.map(m => (
                <option key={m.id} value={m.id}>
                  {m.medication_name}{m.generic_name ? ` (${m.generic_name})` : ''}
                </option>
              ))}
            </select>
          </InputField>
        )}

        <InputField label="Display name / alias" id="rx-alias">
          <input id="rx-alias" type="text" value={form.alias}
            onChange={e => set('alias', e.target.value)}
            placeholder="e.g. Duloxetine 20mg" />
        </InputField>

        <FieldGrid>
          <InputField label="Dose" id="rx-dose">
            <input id="rx-dose" type="text" value={form.dose}
              onChange={e => set('dose', e.target.value)}
              placeholder="e.g. 20mg" />
          </InputField>
          <InputField label="Timing" id="rx-timing">
            <select id="rx-timing" value={form.timing_type_id}
              onChange={e => set('timing_type_id', e.target.value)}
              disabled={timingsLoading}>
              <option value="">{timingsLoading ? 'Loading…' : 'Select timing…'}</option>
              {timingTypes.map(t => (
                <option key={t.id} value={t.id}>{t.timing_name}</option>
              ))}
            </select>
          </InputField>
        </FieldGrid>

        <InputField label="Purpose" id="rx-purpose">
          <input id="rx-purpose" type="text" value={form.purpose}
            onChange={e => set('purpose', e.target.value)}
            placeholder="What it's for…" />
        </InputField>
      </CardSection>

      <CardSection>
        <CardSectionLabel>Other Details</CardSectionLabel>

        <InputField label="Prescriber" id="rx-prescriber">
          <select id="rx-prescriber" value={form.prescriber_id}
            onChange={e => set('prescriber_id', e.target.value)}
            disabled={providersLoading}>
            <option value="">{providersLoading ? 'Loading…' : 'No prescriber linked'}</option>
            {providers.map(p => (
              <option key={p.id} value={p.id}>
                {p.provider_name ?? p.practice_name}
              </option>
            ))}
          </select>
        </InputField>

        <FieldGrid>
          <InputField label="Start date" id="rx-start">
            <input id="rx-start" type="date" value={form.start_date}
              onChange={e => set('start_date', e.target.value)} />
          </InputField>
          <InputField label="Discontinued date" id="rx-disc">
            <input id="rx-disc" type="date" value={form.discontinued_date}
              onChange={e => set('discontinued_date', e.target.value)} />
          </InputField>
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
