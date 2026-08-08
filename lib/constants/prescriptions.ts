

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