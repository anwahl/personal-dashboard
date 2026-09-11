'use client';

import { useState, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { updatePrescription, createPrescription } from '@/lib/dal/medications';
import { Button, Card, CardHeader, CardTitle,
  CardBody, CardActions, ExpandPanel, Info, Meta, FieldActions,
  CardGrid, CardGridColumn, Item,
  ITEM_TYPES, CardSection } from '@/components/ui';
import type { PersonRow } from '@/types/schema';
import { createClient }          from '@/lib/supabase/client';
import type { PrescriptionDetail } from '@/types/dal';
import Link from 'next/link';
import {
  PrescriptionForm,
  PrescriptionFormValues,
  emptyPrescriptionFormValues,
  rxToFormValues,
} from './PrescriptionForm';

interface PrescriptionsByPerson {
  person:        PersonRow;
  prescriptions: PrescriptionDetail[];
}

interface Props {
  prescriptionsByPerson: PrescriptionsByPerson[];
}

function RxItem({
  rx,
  onEdit
}:
Readonly<{
  rx: PrescriptionDetail;
  onEdit: () => void }
>) {
  const isActive = !rx.discontinued_date;
  return (
    <CardGrid>
      <CardGridColumn>
        <Info className='item__title'>
          <Link href={`/medications/${rx.id}`} className="link__generic">
            {rx.alias ?? rx.medication.medication_name}
            {rx.dose ? ` · ${rx.dose}` : ''}
          </Link>
        </Info>
        <Meta>
          {rx.timing_type && <Item itemType={ITEM_TYPES.META} 
            value={rx.timing_type.timing_name} />}
          {rx.purpose && <Item itemType={ITEM_TYPES.META} 
            value={rx.purpose} />}
          {rx.prescriber && <Item itemType={ITEM_TYPES.META}
            value={`Rx: ${rx.prescriber.provider_name ?? rx.prescriber.practice_name}`} />}
          {!isActive && <Item itemType={ITEM_TYPES.META}
            itemModifier={ITEM_TYPES.INACTIVE} value='Discontinued' />}
        </Meta>
        {rx.latest_refill?.refill_due_date && (
          <Meta>
            <Item itemType={ITEM_TYPES.META} itemModifier={ITEM_TYPES.ALERT}
              value={`Refill due: ${rx.latest_refill.refill_due_date}`} />
          </Meta>
        )}
      </CardGridColumn>
      <CardGridColumn>
        <FieldActions alignment='right'>
          <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
          {isActive && <span className="badge badge--success">Active</span>}
        </FieldActions>
      </CardGridColumn>
    </CardGrid>
  );
}

export function PrescriptionsClient({ prescriptionsByPerson }: Readonly<Props>) {
  //TODO Actually, should just pass person in as param, then get prescriptions here.
  const supabase = createClient();
  const router   = useRouter();
  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState<PrescriptionDetail | null>(null);
  const [form,       setForm]       = useState<PrescriptionFormValues>(emptyPrescriptionFormValues);
  const [saving,     setSaving]     = useState(false);

  const openNew  = (personId?: number) => {
    setEditTarget(null);
    setForm({ ...emptyPrescriptionFormValues, person_id: personId ? String(personId) : '' });
    setShowForm(true);
  };

  const openEdit = (rx: PrescriptionDetail) => {
    setEditTarget(rx);
    setForm(rxToFormValues(rx));
    setShowForm(true);
  };

  const cancel = () => { setShowForm(false); setEditTarget(null); };

  const handleSave = useCallback(async (values: PrescriptionFormValues) => {
    setSaving(true);
    try {
      let medId = values.medication_id ? Number.parseInt(values.medication_id) : null;

      if (!medId && values.new_medication_name.trim()) {
        const { data: newMed } = await supabase
          .from('medications')
          .insert({ medication_name: values.new_medication_name.trim() })
          .select('id')
          .single();
        if (newMed) medId = newMed.id;
      }

      if (!medId || !values.person_id) return;

      const payload = {
        person_id:         Number.parseInt(values.person_id),
        medication_id:     medId,
        alias:             values.alias             || null,
        dose:              values.dose              || null,
        timing_type_id:    values.timing_type_id   ? Number.parseInt(values.timing_type_id)   : null,
        purpose:           values.purpose           || null,
        prescriber_id:     values.prescriber_id    ? Number.parseInt(values.prescriber_id)    : null,
        start_date:        values.start_date        || null,
        discontinued_date: values.discontinued_date || null,
        is_active:         !values.discontinued_date,
      };

      if (editTarget) {
        await updatePrescription(supabase, editTarget.id, payload);
      } else {
        await createPrescription(supabase, payload);
      }

      router.refresh();
      cancel();
    } finally {
      setSaving(false);
    }
  }, [supabase, editTarget, router]);

  if (showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{editTarget ? 'Edit Prescription' : 'Add Prescription'}</CardTitle>
        </CardHeader>
        <PrescriptionForm
          key={editTarget?.id ?? 'new'}
          initialValues={form}
          saving={saving}
          saveLabel={editTarget ? 'Update' : 'Add'}
          onSave={handleSave}
          onCancel={cancel}
        />
      </Card>
    );
  }

  return (
    <>
      <FieldActions alignment='right'>
        <Button variant="accent" onClick={() => openNew()}>
          + Add Prescription
        </Button>
      </FieldActions>

      {prescriptionsByPerson.map(({ person, prescriptions }) => {
        const active = prescriptions.filter(rx => rx.is_active);
        const disc   = prescriptions.filter(rx => !rx.is_active);
        if (prescriptions.length === 0) return null;
        return (
          <Card key={person.id}>
            <CardHeader>
              <CardTitle>
                {person.person_name}
              </CardTitle>
              <CardActions>
                <Button size="sm" 
                  variant="action" 
                  onClick={() => openNew(person.id)}>
                    + Add
                </Button>
              </CardActions>
            </CardHeader>
            <CardBody>
                {active.map(rx => 
                  <CardSection key={rx.id}>
                    <RxItem 
                      rx={rx}
                      onEdit={() => openEdit(rx)} 
                    />
                  </CardSection>
                )}
                {disc.length > 0 && (
                  <ExpandPanel
                    title={`${disc.length} Discontinued`}
                    hiddenChildren = {
                      disc.map(rx =>
                        <RxItem key={rx.id}
                          rx={rx}
                          onEdit={() => openEdit(rx)}
                        />)
                    }
                  />
                )}
            </CardBody>
          </Card>
        );
      })}

      {prescriptionsByPerson.every(({ prescriptions }) => prescriptions.length === 0) && (
        <p className="empty-state">No prescriptions yet. Add one above.</p>
      )}
    </>
  );
}