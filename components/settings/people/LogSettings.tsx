'use client';

/**
 * LogSettings — logs (e.g. "School Behavior Log") and their columns.
 * Each log is a heading; its columns are the rows. On a person's page every
 * log entry has a date plus these columns. Select columns list their options
 * (comma-separated).
 */

import { createClient } from '@/lib/supabase/client';
import {
  createLogSchema, renameLogSchema, toggleLogSchema,
  addLogSchemaField, updateLogSchemaField, setLogSchemaFieldOptions, toggleLogSchemaField,
} from '@/lib/dal/people';
import { batchSetSortOrder } from '@/lib/dal/settings';
import { Badge, ManageItemMeta } from '@/components/ui';
import { HierarchicalList, type NormalizedChild } from '../HierarchicalList';
import type { AddField } from '../FieldInputs';
import type { LogSchemaRow, LogSchemaFieldRow, LogSchemaFieldOptionRow } from '@/types/schema';

const COLUMN_TYPES = ['text', 'select', 'textarea'];

const FIELDS: AddField[] = [
  { key: 'name', type: 'text', label: 'Column label', placeholder: 'Column label…', required: true },
  {
    key: 'field_type', type: 'select', label: 'Type', defaultValue: 'text',
    options: COLUMN_TYPES.map(t => ({ value: t, label: t })),
  },
  {
    key: 'options', type: 'text', label: 'Options', placeholder: 'Options, comma-separated…',
    required: false, showWhen: v => v.field_type === 'select',
  },
  { key: 'field_key', type: 'text', label: 'Key', placeholder: 'Key (optional)', required: false, width: 120 },
];

/** The key a column gets when none is given: "Time of day" → "time_of_day". */
const keyFrom = (label: string) => label.trim().toLowerCase().replace(/\s+/g, '_');

const splitOptions = (raw: unknown) =>
  typeof raw === 'string' ? raw.split(',').map(o => o.trim()).filter(Boolean) : [];

function toChild(f: LogSchemaFieldRow, options: LogSchemaFieldOptionRow[]): NormalizedChild {
  return {
    id:         f.id,
    name:       f.field_label,
    is_active:  f.is_active,
    sort_order: f.sort_order ?? 0,
    field_type: f.field_type,
    field_key:  f.field_key,
    options:    options.filter(o => o.field_id === f.id).map(o => o.option_value).join(', '),
  };
}

export function LogSettings({
  logs, fields, options, onLogAdded,
}: Readonly<{
  logs:        LogSchemaRow[];
  fields:      LogSchemaFieldRow[];
  options:     LogSchemaFieldOptionRow[];
  onLogAdded?: (log: { id: number; name: string }) => void;
}>) {
  const supabase = createClient();

  const saveOptions = (fieldId: number, type: unknown, raw: unknown) =>
    setLogSchemaFieldOptions(supabase, fieldId, type === 'select' ? splitOptions(raw) : []);

  return (
    <HierarchicalList
      title="Logs"
      description="Dated entries per person, with the columns you set here (e.g. School Behavior Log: what happened, follow-up)."
      categoryNoun={['log', 'logs']}
      catPlaceholder="New log… (e.g. School Behavior Log)"
      childFields={FIELDS}
      initialCategories={logs.map(l => ({
        id:         l.id,
        name:       l.log_title,
        is_active:  l.is_active,
        sort_order: l.sort_order ?? 0,
        children:   fields.filter(f => f.log_id === l.id).map(f => toChild(f, options)),
      }))}
      renderChildName={child => (
        <>
          {child.name}
          <Badge variant="muted">{String(child.field_type)}</Badge>
          {child.field_type === 'select' && Boolean(child.options) && (
            <ManageItemMeta truncate>{String(child.options)}</ManageItemMeta>
          )}
        </>
      )}
      onCategoryAdded={onLogAdded}
      dal={{
        addCategory:       (name, sort)  => createLogSchema(supabase, { log_title: name, fields: [], sort_order: sort }),
        updateCategory:    (id, name)    => renameLogSchema(supabase, id, name),
        toggleCategory:    (id, active)  => toggleLogSchema(supabase, id, active),
        reorderCategories: updates       => batchSetSortOrder(supabase, 'log_schemas', updates),
        // Columns always belong to a log (no Uncategorized), so catId is set.
        addChild: async (catId, v, sort) => {
          const label = String(v.name);
          const row = await addLogSchemaField(supabase, catId!, label, String(v.field_key ?? ''), String(v.field_type), sort);
          await saveOptions(row.id, v.field_type, v.options);
          return row;
        },
        updateChild: async (id, v) => {
          const label = String(v.name);
          const key   = v.field_key ? String(v.field_key) : keyFrom(label);
          await updateLogSchemaField(supabase, id, label, key, String(v.field_type));
          await saveOptions(id, v.field_type, v.options);
        },
        toggleChild:       (id, active)  => toggleLogSchemaField(supabase, id, active),
        reorderChildren:   updates       => batchSetSortOrder(supabase, 'log_schema_fields', updates),
      }}
    />
  );
}
