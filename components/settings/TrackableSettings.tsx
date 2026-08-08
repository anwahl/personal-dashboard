'use client';

/**
 * TrackableSettings
 *
 * - Boolean category management via ManageableList
 * - Boolean + Numeric trackables via TrackableSection (wraps ManageableList)
 * - Aggregate metrics read-only
 */

import React from 'react';
import { createClient }           from '@/lib/supabase/client';
import { setTrackableCategory }   from '@/lib/dal/trackables';
import { ManageableList }         from './ManageableList';
import type { AddField }          from './ManageableList';
import { IconDisplay }            from '@/components/ui/IconDisplay';
import type { DailyTrackableRow, TrackableCategoryRow, IconRow } from '@/types/schema';

interface Props {
  trackables:        DailyTrackableRow[];
  categories:        TrackableCategoryRow[];
  icons:             IconRow[];
  onCategoryAdded?:  (cat: TrackableCategoryRow) => void;
  onTrackableAdded?: (t: DailyTrackableRow) => void;
}

// ── TrackableSection ─────────────────────────────────────────────────────────
// Replaces CategorizedBooleanList + CategorizedNumericList.
// Differences between types are expressed as config, not duplicate components.

function TrackableSection({
  type,
  initialItems,
  categories,
  icons,
  onTrackableAdded,
}: Readonly<{
  type:              'boolean' | 'numeric';
  initialItems:      DailyTrackableRow[];
  categories:        TrackableCategoryRow[];
  icons:             IconRow[];
  onTrackableAdded?: (t: DailyTrackableRow) => void;
}>) {
  const supabase  = createClient();
  const isNumeric = type === 'numeric';

  const addFields: AddField[] = [
    { key: 'icon_id',   type: 'icon',  label: 'Icon' },
    { key: 'name',      type: 'text',  label: 'Name', placeholder: 'Metric name…', required: true },
    ...(isNumeric
      ? [{ key: 'color_hex', type: 'color' as const, label: 'Color', width: 36 }]
      : []),
    {
      key:        'category_id',
      type:       'select' as const,
      label:      'Category',
      parseAs:    'int'  as const,
      showInEdit: false,   // inline dropdown in renderRowActions handles editing
      options:    categories.filter(c => c.is_active).map(c => ({
        value: String(c.id),
        label: c.category_name,
      })),
    },
  ];

  return (
    <ManageableList
      title={isNumeric ? 'Numeric Metrics' : 'Boolean Metrics'}
      description={
        isNumeric
          ? 'Slider-based (0–10) trackables on the Metrics tab. Categories group them with headers.'
          : 'Done / not-done trackables on the daily Overview tab. Use the category dropdown to group them.'
      }
      tableName="daily_trackables"
      nameColumn="name"
      items={initialItems}
      addFields={addFields}
      extraDefaultFields={{ track_type: type }}
      icons={icons}
      onItemAdded={onTrackableAdded}
      renderName={(item: DailyTrackableRow) => (
        <>
          <IconDisplay
            icon={icons.find(i => i.id === item.icon_id) ?? null}
            size="sm"
            className="trackable-emoji"
          />
          {item.name}
          {isNumeric && item.color_hex && (
            <span className="badge" style={{ background: item.color_hex, color: '#fff', border: 'none' }}>
              &nbsp;
            </span>
          )}
        </>
      )}
      renderRowActions={(item: DailyTrackableRow, updateItem) =>
        item.is_active ? (
          <select
            className="settings-select"
            value={item.category_id ?? ''}
            title="Category"
            onChange={async e => {
              const catId = e.target.value ? Number.parseInt(e.target.value) : null;
              await setTrackableCategory(supabase, item.id, catId);
              updateItem(item.id, { category_id: catId });
            }}
          >
            <option value="">No category</option>
            {categories.filter(c => c.is_active).map(c => (
              <option key={c.id} value={c.id}>{c.category_name}</option>
            ))}
          </select>
        ) : null
      }
    />
  );
}


// ── Main ──────────────────────────────────────────────────────────────────────

export function TrackableSettings({ trackables, categories, icons, onCategoryAdded, onTrackableAdded }: Readonly<Props>) {
  const [liveCategories, setLiveCategories] = React.useState<TrackableCategoryRow[]>(categories);
  const boolean   = trackables.filter(t => t.track_type === 'boolean');
  const numeric   = trackables.filter(t => t.track_type === 'numeric');
  const aggregate = trackables.filter(t => t.track_type === 'aggregate');

  return (
    <div>
      <ManageableList
        title="Boolean Categories"
        description="Group your boolean metrics into labelled sections on the daily Overview tab."
        tableName="trackable_categories"
        nameColumn="category_name"
        items={categories}
        addFields={[
          { key: 'category_name', label: 'Category name', type: 'text', placeholder: 'e.g. Morning, Health', required: true },
        ]}
        onItemAdded={item => {
          const cat = item as TrackableCategoryRow;
          setLiveCategories(prev => [...prev, cat]);
          onCategoryAdded?.(cat);
        }}
      />

      <TrackableSection type="boolean" initialItems={boolean} categories={liveCategories} icons={icons} onTrackableAdded={onTrackableAdded} />

      <TrackableSection type="numeric" initialItems={numeric} categories={liveCategories} icons={icons} onTrackableAdded={onTrackableAdded} />

      {aggregate.length > 0 && (
        <div className="settings-section">
          <div className="settings-section__header">
            <span className="settings-section__title">Aggregate Metrics</span>
          </div>
          <p className="settings-section__desc">Computed automatically. Not editable here.</p>
          {aggregate.map(t => (
            <div key={t.id} className="manage-item">
              <span className="manage-item__name">
<><IconDisplay icon={icons.find(i => i.id === t.icon_id) ?? null} size="sm" className="trackable-emoji" />{t.name}</>
              </span>
              <span className="badge">aggregate</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}