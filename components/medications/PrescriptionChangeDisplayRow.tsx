'use client';

/**
 * Renders a single prescription change history entry.
 * Used by PrescriptionDetailClient and AppointmentDetailClient (MedChangesSection).
 */
import { ConfirmButton, FieldActions,
  Item, CardGrid, CardGridColumn }        from '@/components/ui';
import type { PrescriptionChangeRow }     from '@/types/schema';

interface Props {
  h:        PrescriptionChangeRow;
  onRemove: (id: number) => void;
  label?:   string;
}

export function PrescriptionChangeDisplayRow({ h, onRemove }: Readonly<Props>) {
  return (
    <>
      <Item itemType='title' value={h.field_changed} />
      <CardGrid columns={2}>
        <CardGridColumn>
          <CardGrid columns={3}>
            <Item itemType='info' value={h.previous_value ?? 'N/A'} />
            {h.previous_value || h.new_value ? '→' : ''}
            <Item itemType='info' value={h.new_value ?? 'N/A'} />
          </CardGrid>
        </CardGridColumn>
        <CardGridColumn>
          <FieldActions alignment='right'>
            <ConfirmButton onConfirm={() => onRemove(h.id)} size="sm">✕</ConfirmButton>
          </FieldActions>
        </CardGridColumn>
      </CardGrid>
    </>
  );
}