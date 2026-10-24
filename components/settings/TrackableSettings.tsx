'use client';

/**
 * TrackableSettings
 *
 * - One grouped "Metrics" list (HierarchicalList): Yes/No and 0–10 metrics
 *   together under their categories, with an Uncategorized group. Categories
 *   are managed from their headings.
 * - Aggregate metrics read-only
 */

import { createClient } from '@/lib/supabase/client';
import {
  addSettingsItem, updateSettingsItem, toggleSettingsItem,
  batchSetSortOrder, setItemCategory,
} from '@/lib/dal/settings';
import { HierarchicalList, type NormalizedChild } from './HierarchicalList';
import type { AddField }  from './FieldInputs';
import { IconDisplay }    from '@/components/ui/IconDisplay';
import { ManageItem, Badge, SectionCard } from '@/components/ui';
import type { DailyTrackableRow, TrackableCategoryRow, IconRow } from '@/types/schema';

interface Props {
  trackables:        DailyTrackableRow[];
  categories:        TrackableCategoryRow[];
  icons:             IconRow[];
  onCategoryAdded?:  (cat: TrackableCategoryRow) => void;
  onTrackableAdded?: (t: DailyTrackableRow) => void;
}

const TYPE_LABEL: Record<string, string> = { boolean: 'Yes/No', numeric: '0–10' };

const METRIC_FIELDS: AddField[] = [
  { key: 'icon_id',    type: 'icon',   label: 'Icon' },
  { key: 'name',       type: 'text',   label: 'Name', placeholder: 'Metric name…', required: true },
  {
    key:          'track_type',
    type:         'select',
    label:        'Type',
    defaultValue: 'boolean',
    showInEdit:   false,   // a metric's type is fixed once it has entries
    options:      [
      { value: 'boolean', label: TYPE_LABEL.boolean },
      { value: 'numeric', label: TYPE_LABEL.numeric },
    ],
  },
  {
    key:      'color_hex',
    type:     'color',
    label:    'Color',
    width:    36,
    required: false,
    // In the add row the type is in the values; when editing it's on the item.
    showWhen: values => values.track_type === 'numeric',
  },
];

function toChild(t: DailyTrackableRow): NormalizedChild {
  return {
    id:          t.id,
    name:        t.name,
    is_active:   t.is_active,
    sort_order:  t.sort_order ?? 0,
    track_type:  t.track_type,
    icon_id:     t.icon_id,
    color_hex:   t.color_hex,
  };
}

export function TrackableSettings({ trackables, categories, icons, onCategoryAdded, onTrackableAdded }: Readonly<Props>) {
  const supabase  = createClient();
  const metrics   = trackables.filter(t => t.track_type !== 'aggregate');
  const aggregate = trackables.filter(t => t.track_type === 'aggregate');

  const iconOf = (id: unknown) => icons.find(i => i.id === id) ?? null;

  return (
    <div>
      <HierarchicalList
        title="Metrics"
        description="Yes/No metrics appear on the daily Overview tab; 0–10 metrics on the Metrics tab. Categories group them under headers."
        catPlaceholder="New category… (e.g. Morning, Health)"
        icons={icons}
        childFields={METRIC_FIELDS}
        initialCategories={categories.map(c => ({
          id:         c.id,
          name:       c.category_name,
          is_active:  c.is_active,
          sort_order: c.sort_order ?? 0,
          children:   metrics.filter(t => t.category_id === c.id).map(toChild),
        }))}
        uncategorized={metrics.filter(t => t.category_id == null).map(toChild)}
        renderChildName={child => (
          <>
            <IconDisplay icon={iconOf(child.icon_id)} size="sm" className="trackable-emoji" />
            {child.name}
            <Badge>{TYPE_LABEL[String(child.track_type)] ?? String(child.track_type)}</Badge>
            {child.track_type === 'numeric' && typeof child.color_hex === 'string' && (
              // Dynamic colour from data — legitimate inline style exception
              <span className="color-swatch" style={{ background: child.color_hex }} aria-hidden="true" />
            )}
          </>
        )}
        onCategoryAdded={({ id, name }) => onCategoryAdded?.({ id, category_name: name, is_active: true })}
        onChildAdded={child => onTrackableAdded?.({
          id:          child.id,
          name:        child.name,
          is_active:   child.is_active,
          sort_order:  child.sort_order,
          track_type:  child.track_type as DailyTrackableRow['track_type'],
          icon_id:     (child.icon_id as number | null) ?? null,
          color_hex:   (child.color_hex as string | null) ?? null,
          category_id: (child.category_id as number | null) ?? null,
        })}
        dal={{
          addCategory:       (name, sort)  => addSettingsItem(supabase, 'trackable_categories', { category_name: name, sort_order: sort }),
          updateCategory:    async (id, name) => { await updateSettingsItem(supabase, 'trackable_categories', id, { category_name: name }); },
          toggleCategory:    (id, active)  => toggleSettingsItem(supabase, 'trackable_categories', id, active),
          reorderCategories: updates       => batchSetSortOrder(supabase, 'trackable_categories', updates),
          addChild:          (catId, values, sort) =>
            addSettingsItem(supabase, 'daily_trackables', { ...values, category_id: catId, sort_order: sort }),
          updateChild:       async (id, values) => { await updateSettingsItem(supabase, 'daily_trackables', id, values); },
          toggleChild:       (id, active)  => toggleSettingsItem(supabase, 'daily_trackables', id, active),
          reorderChildren:   updates       => batchSetSortOrder(supabase, 'daily_trackables', updates),
          moveChild:         (id, catId)   => setItemCategory(supabase, 'daily_trackables', id, catId),
        }}
      />

      {aggregate.length > 0 && (
        <SectionCard title="Aggregate Metrics" description="Computed automatically. Not editable here.">
          {aggregate.map(t => (
            <ManageItem key={t.id} inline={<Badge>aggregate</Badge>}>
              <IconDisplay icon={iconOf(t.icon_id)} size="sm" className="trackable-emoji" />
              {t.name}
            </ManageItem>
          ))}
        </SectionCard>
      )}
    </div>
  );
}
