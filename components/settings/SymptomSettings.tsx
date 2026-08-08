'use client';

import { createClient }      from '@/lib/supabase/client';
import { batchSetSortOrder } from '@/lib/dal/settings';
import {
  addSymptomCategory,    updateSymptomCategory, deleteSymptomCategory, toggleSymptomCategory,
  addSymptomType,        updateSymptomType,      deleteSymptomType,      toggleSymptomType,
} from '@/lib/dal/symptoms';
import { HierarchicalList }  from '@/components/settings/HierarchicalList';
import type { SymptomCategoryWithTypes } from '@/types/dal';

interface Props {
  categories: SymptomCategoryWithTypes[];
}

export function SymptomSettings({ categories: initial }: Readonly<Props>) {
  const supabase = createClient();

  return (
    <HierarchicalList
      title="Symptom Types"
      childPlaceholder={catName => `Add ${catName.toLowerCase()} type…`}
      initialCategories={initial.map(c => ({
        id:         c.id,
        name:       c.category_name,
        is_active:  c.is_active,
        sort_order: c.sort_order ?? 0,
        children:   c.types.map(t => ({
          id:         t.id,
          name:       t.symptom_name,
          is_active:  t.is_active,
          sort_order: t.sort_order ?? 0,
        })),
      }))}
      dal={{
        addCategory:       (name, sort)       => addSymptomCategory(supabase, name, sort),
        updateCategory:    (id, name)          => updateSymptomCategory(supabase, id, name),
        deleteCategory:    id                  => deleteSymptomCategory(supabase, id),
        toggleCategory:    (id, active)        => toggleSymptomCategory(supabase, id, active),
        reorderCategories: updates             => batchSetSortOrder(supabase, 'symptom_categories', updates),
        addChild:          (catId, name, sort) => addSymptomType(supabase, catId, name, sort),
        updateChild:       (id, name)          => updateSymptomType(supabase, id, name),
        deleteChild:       id                  => deleteSymptomType(supabase, id),
        toggleChild:       (id, active)        => toggleSymptomType(supabase, id, active),
        reorderChildren:   updates             => batchSetSortOrder(supabase, 'symptom_types', updates),
      }}
    />
  );
}