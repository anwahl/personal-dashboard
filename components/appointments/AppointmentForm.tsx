'use client';

/**
 * AppointmentDialog — add or edit an appointment (FormDialog). Used by the
 * Appointments list (+ New, Edit) and the appointment page (Edit).
 */

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import {
  CardSection, CardSectionLabel, ConfirmButton, FieldGrid, FormDialog,
  DateField, TimeField, SelectField, TextField, TextAreaField,
} from '@/components/ui';
import { createClient }        from '@/lib/supabase/client';
import { createAppointment, updateAppointment, deleteAppointment } from '@/lib/dal/appointments';
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

/** The appointment columns the form edits, ready for create/update. */
function appointmentPayload(values: AppointmentFormValues) {
  return {
    appointment_date:    values.appointment_date,
    appointment_time:    values.appointment_time    || null,
    person_id:           Number.parseInt(values.person_id),
    provider_id:         values.provider_id         ? Number.parseInt(values.provider_id)         : null,
    appointment_type_id: values.appointment_type_id ? Number.parseInt(values.appointment_type_id) : null,
    location:  values.location  || null,
    questions: values.questions || null,
    notes:     values.notes     || null,
  };
}

// ── AppointmentDialog ─────────────────────────────────────────────────────────

/**
 * Add or edit an appointment in a FormDialog. With `appointment` it edits
 * it; without, it adds one. Saves itself and refreshes the page. Pass
 * `onDeleted` to offer Delete inside the dialog (list page).
 */
export function AppointmentDialog({
  open, onOpenChange, appointment, appointmentTypes, people, providers, onDeleted,
}: Readonly<{
  open:             boolean;
  onOpenChange:     (open: boolean) => void;
  /** The appointment to edit; omit to add a new one. */
  appointment?:     AppointmentDetail | null;
  appointmentTypes: AppointmentTypeRow[];
  people:           PersonRow[];
  providers:        ProviderRow[];
  onDeleted?:       () => void;
}>) {
  const supabase = createClient();
  const router   = useRouter();
  const initialValues = appointment ? apptToFormValues(appointment) : emptyAppointmentFormValues;

  const [form, setForm] = useState<AppointmentFormValues>(initialValues);
  // Each open starts from the appointment (or blank) again.
  useEffect(() => {
    if (open) setForm(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: keyof AppointmentFormValues, v: string) =>
    setForm(p => ({ ...p, [k]: v }));
  // Picking a provider fills an empty Location with their practice name.
  const pickProvider = (id: string) => setForm(p => {
    const practice = providers.find(pr => String(pr.id) === id)?.practice_name;
    return { ...p, provider_id: id, location: p.location.trim() || !practice ? p.location : practice };
  });

  const save = async () => {
    const payload = appointmentPayload(form);
    if (appointment) await updateAppointment(supabase, appointment.id, payload);
    else             await createAppointment(supabase, { ...payload, followup_for_id: null });
    router.refresh();
  };

  const remove = async () => {
    if (!appointment) return;
    await deleteAppointment(supabase, appointment.id);
    onOpenChange(false);
    router.refresh();
    onDeleted?.();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={appointment ? 'Edit appointment' : 'New appointment'}
      saveLabel={appointment ? 'Save' : 'Add'}
      canSave={Boolean(form.appointment_date && form.person_id)}
      onSave={save}
      extraActions={appointment && onDeleted && (
        <ConfirmButton onConfirm={remove}>✕ Delete appointment</ConfirmButton>
      )}
    >
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
                    <SelectField label="Provider" value={form.provider_id} onChange={pickProvider}
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
    </FormDialog>
  );
}
