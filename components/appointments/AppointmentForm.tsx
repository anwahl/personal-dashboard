'use client';

/**
 * AppointmentForm — shared form used by both AppointmentsClient (add/edit
 * from the list page) and AppointmentDetailClient (edit mode on detail page).
 *
 * Owns its own form state; calls onSave(values) on submit so the parent
 * can handle the async operation and pass back `saving` / `saveState`.
 */

import { useState }            from 'react';
import {
  Button, Card, CardBody, CardHeader, CardSection, CardSectionLabel, CardTitle, FieldActions, FieldGrid, SaveStatus,
  DateField, TimeField, SelectField, TextField, TextAreaField,
} from '@/components/ui';
import type { SaveState }      from '@/components/ui';
import type { AppointmentDetail } from '@/types/dal';
import type { AppointmentTypeRow, PersonRow, ProviderRow } from '@/types/schema';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppointmentFormValues {
  appointment_date:    string;
  appointment_time:    string;
  person_id:           string;
  provider_id:         string;
  appointment_type_id: string;
  location:            string;
  questions:           string;
  notes:               string;
}

export const emptyAppointmentFormValues: AppointmentFormValues = {
  appointment_date: '', appointment_time: '', person_id: '',
  provider_id: '', appointment_type_id: '',
  location: '', questions: '', notes: '',
};

/** Convert a full AppointmentDetail into form values. */
export function apptToFormValues(a: AppointmentDetail): AppointmentFormValues {
  return {
    appointment_date:    a.appointment_date,
    appointment_time:    a.appointment_time         ?? '',
    person_id:           String(a.person_id),
    provider_id:         a.provider_id         ? String(a.provider_id)         : '',
    appointment_type_id: a.appointment_type_id ? String(a.appointment_type_id) : '',
    location:  a.location  ?? '',
    questions: a.questions ?? '',
    notes:     a.notes     ?? '',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  initialValues:    AppointmentFormValues;
  appointmentTypes: AppointmentTypeRow[];
  people:           PersonRow[];
  providers:        ProviderRow[];
  /** The parent's async save is in flight. */
  saving:           boolean;
  /** Renders a <SaveStatus> indicator when provided (detail page). */
  saveState?:       SaveState;
  saveLabel?:       string;
  onSave:           (values: AppointmentFormValues) => void;
  onCancel:         () => void;
  /** Renders a danger Delete button when provided (list page). */
  onDelete?:        () => void;
}

export function AppointmentForm({
  initialValues, appointmentTypes, people, providers,
  saving, saveState, saveLabel = 'Save',
  onSave, onCancel, onDelete,
}: Readonly<Props>) {
  const [form, setForm] = useState<AppointmentFormValues>(initialValues);
  const set = (k: keyof AppointmentFormValues, v: string) =>
    setForm(p => ({ ...p, [k]: v }));

  return (
    <Card>
        <CardHeader>
            <CardTitle>Appointment</CardTitle>
        </CardHeader>
        <CardBody>
            <CardSection>
                <CardSectionLabel>Primary Details</CardSectionLabel>
                <FieldGrid>
                    <DateField label="Date" value={form.appointment_date} onChange={v => set('appointment_date', v)} />
                    <TimeField label="Time" value={form.appointment_time} onChange={v => set('appointment_time', v)} />
                </FieldGrid>
                <FieldGrid>
                    <SelectField label="For" value={form.person_id} onChange={v => set('person_id', v)}
                        placeholder="Select person…"
                        options={people.map(p => ({ value: p.id, label: p.person_name }))} />
                    <SelectField label="Type" value={form.appointment_type_id} onChange={v => set('appointment_type_id', v)}
                        placeholder="No type"
                        options={appointmentTypes.map(t => ({ value: t.id, label: t.type_name }))} />
                </FieldGrid>
            </CardSection>
            <CardSection>
                <CardSectionLabel>Secondary Details</CardSectionLabel>
                <FieldGrid>
                    <SelectField label="Provider" value={form.provider_id} onChange={v => set('provider_id', v)}
                        placeholder="No provider linked"
                        options={providers.map(p => ({ value: p.id, label: p.provider_name ?? p.practice_name ?? '' }))} />
                    <TextField label="Location" value={form.location} onChange={v => set('location', v)}
                        placeholder="Office, telehealth…" />
                </FieldGrid>
            </CardSection>
            <CardSection>
                <CardSectionLabel>Other</CardSectionLabel>
                <TextAreaField label="Questions to ask" value={form.questions} onChange={v => set('questions', v)}
                    placeholder="Topics to cover…" size="short" />
                <TextAreaField label="Notes" value={form.notes} onChange={v => set('notes', v)}
                    placeholder="Notes from the appointment…" size="short" />
            </CardSection>

            <FieldActions docked alignment="right">
                <Button
                        variant="accent"
                        onClick={() => onSave(form)}
                        disabled={saving || !form.appointment_date || !form.person_id} >
                    {saving ? 'Saving…' : saveLabel}
                </Button>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                {onDelete && (
                    <Button variant="danger" onClick={onDelete} disabled={saving}>Delete</Button>
                )}
                {saveState && <SaveStatus state={saveState} />}
            </FieldActions>
        </CardBody>
    </Card>
  );
}