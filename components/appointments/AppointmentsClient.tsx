'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import Link                      from 'next/link';
import { createClient }          from '@/lib/supabase/client';
import { createAppointment, updateAppointment, deleteAppointment } from '@/lib/dal/appointments';
import { Button, Card, CardBody, CardHeader, CardTitle, Chip, ExpandPanel, FieldActions, Markdown, SubCard, SubCardBody }      from '@/components/ui';
import { localTodayISO, daysUntil, formatMediumDate, formatTime } from '@/lib/utils/dates';
import type { AppointmentDetail }    from '@/types/dal';
import type { AppointmentTypeRow, PersonRow, ProviderRow } from '@/types/schema';
import {
  AppointmentForm, AppointmentFormValues,
  emptyAppointmentFormValues, apptToFormValues,
} from './AppointmentForm';

interface Props {
  upcoming:         AppointmentDetail[];
  past:             AppointmentDetail[];
  appointmentTypes: AppointmentTypeRow[];
  people:           PersonRow[];
  providers:        ProviderRow[];
}

// ── Appointment row (collapsible) ─────────────────────────────────────────────

function ApptRow({ appt, onEdit }: Readonly<{ appt: AppointmentDetail; onEdit: () => void }>) {
  const isPast = appt.appointment_date < localTodayISO();

  return (
    <>
      <SubCard>
        <SubCardBody>
          <div
            className={`list-item${isPast ? ' list-item--muted' : ''}`}>

            <div className="list-item__body">

              <CardTitle>
                {appt.appointment_type?.type_name ?? 'Appointment'}
                {appt.provider ? ` · ${appt.provider.provider_name ?? appt.provider.practice_name ?? ''}` : ''}
              </CardTitle>

              <div className="list-item__meta">
                <span>
                  {formatMediumDate(appt.appointment_date)}
                  {appt.appointment_time ? ` · ${formatTime(appt.appointment_time)}` : ''}
                </span>
                {appt.person   && <span>For: {appt.person.person_name}</span>}
                {appt.location && <span>📍 {appt.location}</span>}
              </div>
            </div>
            
            <Chip small={true} fixed={true} className={`${!isPast ? ' chip--accent' : ''}`}>
              {daysUntil(appt.appointment_date)}
            </Chip>
          </div>

          {(appt.questions || appt.notes) && (
            <ExpandPanel title='Show More'
              hiddenChildren = {
                <>
                  {appt.questions && (
                    <>
                      <p className="expand-panel__label">Questions to ask</p>
                      <div className="detail-page__body-markdown">
                        <Markdown>{appt.questions}</Markdown>
                      </div>
                    </>
                    )}
                    {appt.notes && (
                    <>
                      <p className="expand-panel__label">Notes</p>
                      <div className="detail-page__body-markdown">
                        <Markdown>{appt.notes}</Markdown>
                      </div>
                    </>
                  )}
                </>
              } 
            />
          )}
          <FieldActions alignment='bottom'>
            <Link href={`/appointments/${appt.id}`} className="btn btn--action btn--sm">
              View Details →
            </Link>
            <Button size="sm" variant="action" onClick={e => { e.stopPropagation(); onEdit(); }}>
              ✏️ Edit
            </Button>
          </FieldActions>
        </SubCardBody>
      </SubCard>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AppointmentsClient({ upcoming, past, appointmentTypes, people, providers }: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [localUpcoming, setLocalUpcoming] = useState(upcoming);
  const [localPast,     setLocalPast]     = useState(past);
  useEffect(() => { setLocalUpcoming(upcoming); }, [upcoming]);
  useEffect(() => { setLocalPast(past); }, [past]);

  const [showForm,   setShowForm]   = useState(false);
  const [showPast,   setShowPast]   = useState(false);
  const [editTarget, setEditTarget] = useState<AppointmentDetail | null>(null);
  const [saving,     setSaving]     = useState(false);

  const openNew  = () => { setEditTarget(null); setShowForm(true); };
  const openEdit = (a: AppointmentDetail) => { setEditTarget(a); setShowForm(true); };
  const cancel   = () => { setShowForm(false); setEditTarget(null); };

  const handleSave = useCallback(async (values: AppointmentFormValues) => {
    setSaving(true);
    try {
      const payload = {
        appointment_date:    values.appointment_date,
        appointment_time:    values.appointment_time    || null,
        person_id:           Number.parseInt(values.person_id),
        provider_id:         values.provider_id         ? Number.parseInt(values.provider_id)         : null,
        appointment_type_id: values.appointment_type_id ? Number.parseInt(values.appointment_type_id) : null,
        location:  values.location  || null,
        questions: values.questions || null,
        notes:     values.notes     || null,
        followup_for_id: null,
      };
      if (editTarget) await updateAppointment(supabase, editTarget.id, payload);
      else            await createAppointment(supabase, payload);
      router.refresh();
      cancel();
    } finally {
      setSaving(false);
    }
  }, [supabase, editTarget, router]);

  const handleDelete = useCallback(async () => {
    if (!editTarget || !confirm('Delete this appointment?')) return;
    setSaving(true);
    try {
      await deleteAppointment(supabase, editTarget.id);
      router.refresh();
      cancel();
    } finally {
      setSaving(false);
    }
  }, [supabase, editTarget, router]);

  return (
    <div>
      {showForm ? (
        <div className="form-panel--card">
          <AppointmentForm
            key={editTarget?.id ?? 'new'}
            initialValues={editTarget ? apptToFormValues(editTarget) : emptyAppointmentFormValues}
            appointmentTypes={appointmentTypes}
            people={people}
            providers={providers}
            saving={saving}
            saveLabel={editTarget ? 'Update' : 'Add Appointment'}
            onSave={handleSave}
            onCancel={cancel}
            onDelete={editTarget ? handleDelete : undefined}
          />
        </div>
      ) : (
        <div className="page-actions">
          <Button variant="accent" onClick={openNew}>+ New Appointment</Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardBody>  
          <div className="section-divider">Upcoming ({localUpcoming.length})</div>
          {localUpcoming.length === 0
            ? <p className="empty-state">No upcoming appointments.</p>
            : localUpcoming.map(a => <ApptRow key={a.id} appt={a} onEdit={() => openEdit(a)} />)
          }

          <div className="toggle-btn-section">
            <Button
              variant="ghost"
              className="toggle-btn"
              onClick={() => setShowPast(s => !s)}
            >
              {showPast ? '▲ Hide' : '▼ Show'} past appointments ({localPast.length})
            </Button>

            {showPast && (
              <div className="toggle-btn-section__body">
                {localPast.length === 0
                  ? <p className="empty-state">No past appointments on record.</p>
                  : localPast.map(a => <ApptRow key={a.id} appt={a} onEdit={() => openEdit(a)} />)
                }
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}