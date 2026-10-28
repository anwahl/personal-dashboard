'use client';

import { useState, type ReactNode } from 'react';
import { Button, Card, CardHeader, CardTitle,
  CardBody, CardActions, ExpandPanel, Info, Meta, FieldActions,
  CardGrid, CardGridColumn, Item,
  ITEM_TYPES, CardSection, CardSectionHeader, CardSectionLabel, EmptyState, AddButton, RowMenu
} from '@/components/ui';
import type { PersonRow } from '@/types/schema';
import type { PrescriptionDetail } from '@/types/dal';
import Link from 'next/link';
import { PrescriptionDialog } from './PrescriptionForm';

interface PrescriptionsByPerson {
  person:        PersonRow;
  prescriptions: PrescriptionDetail[];
}

interface Props {
  prescriptionsByPerson: PrescriptionsByPerson[];
  /** Inside a LayoutCard: each person is a section instead of its own card. */
  bare?:                 boolean;
}

/** One person's prescriptions: a card, or a section when bare. */
function PersonGroup({ name, actions, bare, children }: Readonly<{
  name: string; actions: ReactNode; bare: boolean; children: ReactNode;
}>) {
  if (bare) {
    return (
      <CardSection>
        <CardSectionHeader>
          <CardSectionLabel>{name}</CardSectionLabel>
          <CardActions>{actions}</CardActions>
        </CardSectionHeader>
        {children}
      </CardSection>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardActions>{actions}</CardActions>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
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
          <RowMenu label={rx.alias ?? rx.medication.medication_name} items={[{ label: 'Edit…', onSelect: onEdit }]} />
        </FieldActions>
      </CardGridColumn>
    </CardGrid>
  );
}

export function PrescriptionsClient({ prescriptionsByPerson, bare = false }: Readonly<Props>) {
  //TODO Actually, should just pass person in as param, then get prescriptions here.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PrescriptionDetail | null>(null);
  const [forPerson,  setForPerson]  = useState<number | undefined>();

  const openNew = (personId?: number) => {
    setEditTarget(null);
    setForPerson(personId);
    setDialogOpen(true);
  };

  const openEdit = (rx: PrescriptionDetail) => {
    setEditTarget(rx);
    setDialogOpen(true);
  };

  return (
    <>
      <FieldActions docked alignment='right'>
        <Button variant="primary" onClick={() => openNew()}>
          + New Prescription
        </Button>
      </FieldActions>

      <PrescriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prescription={editTarget}
        personId={forPerson}
      />

      {prescriptionsByPerson.map(({ person, prescriptions }) => {
        const active = prescriptions.filter(rx => rx.is_active);
        const disc   = prescriptions.filter(rx => !rx.is_active);
        if (prescriptions.length === 0) return null;
        return (
          <PersonGroup key={person.id} name={person.person_name} bare={bare}
            actions={<AddButton label={`Add a prescription for ${person.person_name}`} onClick={() => openNew(person.id)} />}>
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
          </PersonGroup>
        );
      })}

      {prescriptionsByPerson.every(({ prescriptions }) => prescriptions.length === 0) && (
        <EmptyState>No prescriptions yet. Add one above.</EmptyState>
      )}
    </>
  );
}