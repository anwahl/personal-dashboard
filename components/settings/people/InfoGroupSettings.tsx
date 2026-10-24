'use client';

/**
 * InfoGroupSettings — info groups (e.g. "Medical Info") and their fields.
 * Each group is a heading; its fields are the rows. Linked to people in
 * "Link to People"; values are filled in on each person's page.
 */

import { createClient } from '@/lib/supabase/client';
import {
  createInfoGroup, renameInfoGroup, toggleInfoGroup,
  addInfoFieldType, updateInfoFieldType, toggleInfoFieldType,
} from '@/lib/dal/people';
import { batchSetSortOrder } from '@/lib/dal/settings';
import { Badge } from '@/components/ui';
import { HierarchicalList, type NormalizedChild } from '../HierarchicalList';
import type { AddField } from '../FieldInputs';
import type { InfoGroupRow, InfoFieldTypeRow } from '@/types/schema';

const FIELD_TYPES = ['text', 'date', 'textarea'];

const FIELDS: AddField[] = [
  { key: 'name', type: 'text', label: 'Field label', placeholder: 'Field label…', required: true },
  {
    key: 'field_type', type: 'select', label: 'Type', defaultValue: 'text',
    options: FIELD_TYPES.map(t => ({ value: t, label: t })),
  },
];

function toChild(f: InfoFieldTypeRow): NormalizedChild {
  return { id: f.id, name: f.field_label, is_active: f.is_active, sort_order: f.sort_order ?? 0, field_type: f.field_type };
}

export function InfoGroupSettings({
  groups, fields, onGroupAdded,
}: Readonly<{
  groups:        InfoGroupRow[];
  fields:        InfoFieldTypeRow[];
  onGroupAdded?: (group: { id: number; name: string }) => void;
}>) {
  const supabase = createClient();

  return (
    <HierarchicalList
      title="Info Groups"
      description="Sets of fields filled in once per person (e.g. Medical Info: blood type, allergies)."
      categoryNoun={['group', 'groups']}
      catPlaceholder="New info group… (e.g. Medical Info)"
      childFields={FIELDS}
      initialCategories={groups.map(g => ({
        id:         g.id,
        name:       g.group_title,
        is_active:  g.is_active,
        sort_order: g.sort_order ?? 0,
        children:   fields.filter(f => f.group_id === g.id).map(toChild),
      }))}
      renderChildName={child => (
        <>
          {child.name}
          <Badge variant="muted">{String(child.field_type)}</Badge>
        </>
      )}
      onCategoryAdded={onGroupAdded}
      dal={{
        addCategory:       (name, sort)  => createInfoGroup(supabase, { group_title: name, fields: [], sort_order: sort }),
        updateCategory:    (id, name)    => renameInfoGroup(supabase, id, name),
        toggleCategory:    (id, active)  => toggleInfoGroup(supabase, id, active),
        reorderCategories: updates       => batchSetSortOrder(supabase, 'info_groups', updates),
        // Fields always belong to a group (no Uncategorized), so catId is set.
        addChild:          (catId, v, sort) => addInfoFieldType(supabase, catId!, String(v.name), String(v.field_type), sort),
        updateChild:       (id, v)       => updateInfoFieldType(supabase, id, String(v.name), String(v.field_type)),
        toggleChild:       (id, active)  => toggleInfoFieldType(supabase, id, active),
        reorderChildren:   updates       => batchSetSortOrder(supabase, 'info_field_types', updates),
      }}
    />
  );
}
