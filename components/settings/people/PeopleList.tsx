'use client';

/**
 * PeopleList — people grouped by people category.
 *
 * Category headings carry an "Assignable" toggle (⋯ menu): people in an
 * assignable category appear in task, appointment and prescription dropdowns.
 * People with no category sit in an Uncategorized group.
 */

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createPerson, updatePersonField, setPeopleCategoryAssignable } from '@/lib/dal/people';
import {
  addSettingsItem, updateSettingsItem, toggleSettingsItem, batchSetSortOrder, setItemCategory,
} from '@/lib/dal/settings';
import { Badge } from '@/components/ui';
import { HierarchicalList, type NormalizedChild } from '../HierarchicalList';
import type { PersonRow, PeopleCategoryRow } from '@/types/schema';

function toChild(p: PersonRow): NormalizedChild {
  return {
    id:          p.id,
    name:        p.person_name,
    is_active:   p.is_active,
    sort_order:  p.sort_order ?? 0,
    category_id: p.category_id,
  };
}

/** Back from the list's shape to a person row (for the Link to People section). */
export function personFromChild(child: NormalizedChild, base?: PersonRow): PersonRow {
  return {
    ...(base ?? { birth_date: null, is_self: false, created_at: '' }),
    id:          child.id,
    person_name: child.name,
    is_active:   child.is_active,
    sort_order:  child.sort_order,
    category_id: (child.category_id as number | null | undefined) ?? base?.category_id ?? null,
  } as PersonRow;
}

export function PeopleList({
  people, categories, onPersonAdded, onPersonChange,
}: Readonly<{
  people:          PersonRow[];
  categories:      PeopleCategoryRow[];
  onPersonAdded?:  (child: NormalizedChild) => void;
  onPersonChange?: (child: NormalizedChild) => void;
}>) {
  const supabase = createClient();
  const router   = useRouter();

  return (
    <HierarchicalList
      title="People"
      description="Each person gets a page at /people/[name]. People in an assignable category (⋯ → Assignable) appear in task, appointment and prescription dropdowns."
      catPlaceholder="New category… (e.g. Family)"
      childPlaceholder="Add person…"
      initialCategories={categories.map(c => ({
        id:            c.id,
        name:          c.category_name,
        is_active:     c.is_active,
        sort_order:    c.sort_order ?? 0,
        is_assignable: c.is_assignable,
        children:      people.filter(p => p.category_id === c.id).map(toChild),
      }))}
      uncategorized={people.filter(p => p.category_id == null).map(toChild)}
      renderCategoryName={cat => (
        <>
          {cat.name}
          {Boolean(cat.is_assignable) && <Badge variant="accent">Assignable</Badge>}
        </>
      )}
      categoryMenuItems={(cat, patch) => [{
        label:    'Assignable',
        checked:  Boolean(cat.is_assignable),
        onSelect: async () => {
          const next = !cat.is_assignable;
          await setPeopleCategoryAssignable(supabase, cat.id, next);
          patch({ is_assignable: next });
        },
      }]}
      onChildAdded={child => { onPersonAdded?.(child); router.refresh(); }}
      onChildChange={child => { onPersonChange?.(child); router.refresh(); }}
      dal={{
        addCategory:       (name, sort)  => addSettingsItem(supabase, 'people_categories', { category_name: name, sort_order: sort }),
        updateCategory:    async (id, name) => { await updateSettingsItem(supabase, 'people_categories', id, { category_name: name }); },
        toggleCategory:    (id, active)  => toggleSettingsItem(supabase, 'people_categories', id, active),
        reorderCategories: updates       => batchSetSortOrder(supabase, 'people_categories', updates),
        addChild:          (catId, values, sort) =>
          createPerson(supabase, { person_name: String(values.name), category_id: catId, sort_order: sort }),
        updateChild:       (id, values)  => updatePersonField(supabase, id, { person_name: String(values.name) }),
        toggleChild:       (id, active)  => toggleSettingsItem(supabase, 'people', id, active),
        reorderChildren:   updates       => batchSetSortOrder(supabase, 'people', updates),
        moveChild:         (id, catId)   => setItemCategory(supabase, 'people', id, catId),
      }}
    />
  );
}
