'use client';

/**
 * AppointmentForm — shared form used by both AppointmentsClient (add/edit
 * from the list page) and AppointmentDetailClient (edit mode on detail page).
 *
 * Owns its own form state; calls onSave(values) on submit so the parent
 * can handle the async operation and pass back `saving` / `saveState`.
 */

import { useState }            from 'react';
import { Button, Card, CardBody, CardHeader, CardSection, CardSectionLabel, CardTitle, InputField, SaveStatus } from '@/components/ui';
import type { SaveState }      from '@/components/ui';
import type { AppointmentDetail } from '@/types/dal';
import type { AppointmentTypeRow, PersonRow, ProviderRow } from '@/types/schema';
import { FieldGrid } from '../ui/Display';

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
                    <InputField label="Date" id="af-date">
                        <input id="af-date" type="date" value={form.appointment_date}
                            onChange={e => set('appointment_date', e.target.value)} />
                    </InputField>
                    <InputField label="Time" id="af-time">
                        <input id="af-time" type="time" value={form.appointment_time}
                            onChange={e => set('appointment_time', e.target.value)} />
                    </InputField>
                </FieldGrid>
                <FieldGrid>
                    <InputField label="For" id="af-person">
                        <select id="af-person" value={form.person_id}
                            onChange={e => set('person_id', e.target.value)}>
                            <option value="">Select person…</option>
                            {people.map(p => <option key={p.id} value={p.id}>{p.person_name}</option>)}
                        </select>
                    </InputField>
                    <InputField label="Type" id="af-type">
                        <select id="af-type" value={form.appointment_type_id}
                            onChange={e => set('appointment_type_id', e.target.value)}>
                            <option value="">No type</option>
                            {appointmentTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                        </select>
                    </InputField>
                </FieldGrid>
            </CardSection>
            <CardSection>
                <CardSectionLabel>Secondary Details</CardSectionLabel>
                <FieldGrid>
                    <InputField label="Provider" id="af-provider">
                        <select id="af-provider" value={form.provider_id}
                        onChange={e => set('provider_id', e.target.value)}>
                            <option value="">No provider linked</option>
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>{p.provider_name ?? p.practice_name}</option>
                            ))}
                        </select>
                    </InputField>
                    <InputField label="Location" id="af-location">
                        <input id="af-location" type="text" value={form.location}
                            onChange={e => set('location', e.target.value)}
                            placeholder="Office, telehealth…" />
                    </InputField>
                </FieldGrid>
            </CardSection>
            <CardSection>
                <CardSectionLabel>Other</CardSectionLabel>
                <InputField label="Questions to ask" id="af-questions">
                    <textarea id="af-questions" value={form.questions}
                        onChange={e => set('questions', e.target.value)}
                        placeholder="Topics to cover…" className="textarea--short" />
                </InputField>
                <InputField label="Notes" id="af-notes">
                    <textarea id="af-notes" value={form.notes}
                        onChange={e => set('notes', e.target.value)}
                        placeholder="Notes from the appointment…" className="textarea--short" />
                </InputField>
            </CardSection>

            <div className="page-actions">
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
            </div>
        </CardBody>
    </Card>
  );
}