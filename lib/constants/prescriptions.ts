import { formatMediumDate } from '@/lib/utils/dates';
import type { PrescriptionDetail } from '@/types/dal';
import type { MedicationTimingTypeRow } from '@/types/schema';

export const RX_FIELDS = [
  { key: 'dose',              label: 'Dose',              type: 'text'   },
  { key: 'timing_type_id',    label: 'Timing',            type: 'timing' },
  { key: 'purpose',           label: 'Purpose',           type: 'text'   },
  { key: 'alias',             label: 'Alias / Nickname',  type: 'text'   },
  { key: 'start_date',        label: 'Start Date',        type: 'date'   },
  { key: 'discontinued_date', label: 'Discontinued Date', type: 'date'   },
  { key: 'is_active',         label: 'Status',            type: 'status' },
] as const;

export type RxFieldKey = typeof RX_FIELDS[number]['key'];

/** A single staged field change, before it's applied to the DB. */
export interface PendingChange {
  uid:           string;
  fieldKey:      RxFieldKey;
  fieldLabel:    string;
  previousValue: string;
  newValue:      string;
  newTimingId:   string;
}

/** Returns the current display value for a prescription field. */
export function getRxDisplayValue(
  rx:      PrescriptionDetail,
  key:     RxFieldKey,
  timings: MedicationTimingTypeRow[],
): string {
  switch (key) {
    case 'dose':              return rx.dose              ?? '';
    case 'timing_type_id':    return timings.find(t => t.id === rx.timing_type_id)?.timing_name ?? '';
    case 'purpose':           return rx.purpose           ?? '';
    case 'alias':             return rx.alias             ?? '';
    case 'start_date':        return rx.start_date        ? formatMediumDate(rx.start_date)        : '';
    case 'discontinued_date': return rx.discontinued_date ? formatMediumDate(rx.discontinued_date) : '';
    case 'is_active':         return rx.is_active ? 'Active' : 'Discontinued';
    default:                  return '';
  }
}