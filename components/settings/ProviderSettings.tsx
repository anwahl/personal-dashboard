'use client';

/**
 * ProviderSettings — healthcare providers, grouped by provider type.
 *
 * Each type (Doctor, Dentist, Lab…) is a group; "+ Type" adds one. Providers
 * are added under their type, dragged to reorder, and moved between types
 * from the ⋯ menu. Types and providers are deactivated, never deleted.
 *
 * A provider's row name is the provider's name, or the practice when there's
 * no person's name (e.g. a lab).
 */

import { createClient } from '@/lib/supabase/client';
import { createProvider, updateProvider, toggleProviderActive } from '@/lib/dal/providers';
import { addSettingsItem, updateSettingsItem, toggleSettingsItem, batchSetSortOrder } from '@/lib/dal/settings';
import { HierarchicalList, type NormalizedChild } from './HierarchicalList';
import type { AddField } from './FieldInputs';
import type { ProviderRow, ProviderTypeRow } from '@/types/schema';

const PROVIDER_FIELDS: AddField[] = [
  { key: 'name',          type: 'text', label: 'Provider name', placeholder: 'Dr. Smith',              required: false },
  { key: 'practice_name', type: 'text', label: 'Practice',      placeholder: 'Helena Family Medicine', required: false },
  { key: 'phone',         type: 'text', label: 'Phone',         placeholder: '(406) 555-1234',         required: false },
];

const orNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

function toChild(p: ProviderRow): NormalizedChild {
  return {
    id:            p.id,
    name:          p.provider_name ?? '',
    practice_name: p.practice_name ?? '',
    phone:         p.phone ?? '',
    is_active:     p.is_active,
    sort_order:    p.sort_order ?? 0,
  };
}

interface Props {
  providers:     ProviderRow[];
  providerTypes: ProviderTypeRow[];
}

export function ProviderSettings({ providers, providerTypes }: Readonly<Props>) {
  const supabase = createClient();

  return (
    <HierarchicalList
      title="Providers"
      description="Healthcare providers linked to appointments and prescriptions, grouped by type. Fill in a provider name, a practice, or both."
      categoryNoun={['type', 'types']}
      catPlaceholder="New type… (e.g. Dentist)"
      childFields={PROVIDER_FIELDS}
      initialCategories={providerTypes.map(t => ({
        id:         t.id,
        name:       t.type_name,
        is_active:  t.is_active,
        sort_order: t.sort_order ?? 0,
        children:   providers.filter(p => p.provider_type_id === t.id).map(toChild),
      }))}
      renderChildName={child => {
        const practice = String(child.practice_name ?? '');
        return (
          <>
            {child.name || practice || 'Unnamed'}
            {child.name && practice && <span className="manage-item__meta">{practice}</span>}
          </>
        );
      }}
      dal={{
        addCategory:       (name, sort)  => addSettingsItem(supabase, 'provider_types', { type_name: name, sort_order: sort }),
        updateCategory:    async (id, name) => { await updateSettingsItem(supabase, 'provider_types', id, { type_name: name }); },
        toggleCategory:    (id, active)  => toggleSettingsItem(supabase, 'provider_types', id, active),
        reorderCategories: updates       => batchSetSortOrder(supabase, 'provider_types', updates),
        addChild:          (typeId, values, sort) => createProvider(supabase, {
          // Providers always have a type; there's no Uncategorized group here.
          provider_type_id: typeId!,
          provider_name:    orNull(values.name),
          practice_name:    orNull(values.practice_name),
          phone:            orNull(values.phone),
          sort_order:       sort,
        }),
        updateChild:       async (id, values) => {
          await updateProvider(supabase, id, {
            provider_name: orNull(values.name),
            practice_name: orNull(values.practice_name),
            phone:         orNull(values.phone),
          });
        },
        toggleChild:       (id, active)  => toggleProviderActive(supabase, id, active),
        reorderChildren:   updates       => batchSetSortOrder(supabase, 'providers', updates),
        moveChild:         async (id, typeId) => {
          if (typeId != null) await updateProvider(supabase, id, { provider_type_id: typeId });
        },
      }}
    />
  );
}
