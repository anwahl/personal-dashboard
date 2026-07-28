'use client';

/**
 * TrackableSettings
 *
 * - Category management via ManageableList
 * - Boolean trackables via a custom CategorizedBooleanList that
 *   includes the standard CRUD actions AND a category select per row
 * - Numeric / Aggregate via ManageableList (unchanged)
 */

import { useState, useCallback } from 'react';
import { createClient }          from '@/lib/supabase/client';
import { setTrackableCategory }  from '@/lib/dal/trackables';
import {
  toggleSettingsItem, updateSettingsItem, deleteSettingsItem,
  batchSetSortOrder,
} from '@/lib/dal/settings';
import { bySortOrder, normalizedReorderUpdates } from '@/lib/utils/sort';
import { ManageableList }  from './ManageableList';
import { Button }          from '@/components/ui/Button';
import { IconDisplay }     from '@/components/ui/IconDisplay';
import { IconPicker }      from '@/components/ui/IconPicker';
import { ConfirmButton }   from '@/components/ui/ConfirmButton';
import type { DailyTrackableRow, TrackableCategoryRow, IconRow } from '@/types/schema';

interface Props {
  trackables: DailyTrackableRow[];
  categories: TrackableCategoryRow[];
  icons:      IconRow[];
}

// ── Single boolean trackable row (full CRUD + category select) ─────────────────

function BooleanRow({
  item, categories, isFirst, isLast, icons,
  onUpdate, onCategoryChange, onToggle, onDelete, onMoveUp, onMoveDown,
}: Readonly<{
  item:             DailyTrackableRow;
  categories:       TrackableCategoryRow[];
  isFirst:          boolean;
  isLast:           boolean;
  onUpdate:         (id: number, iconId: number | null, name: string) => Promise<void>;
  icons:            IconRow[];
  onCategoryChange: (id: number, catId: number | null) => Promise<void>;
  onToggle:         (id: number, active: boolean)       => Promise<void>;
  onDelete:         (id: number)                        => Promise<void>;
  onMoveUp:         () => void;
  onMoveDown:       () => void;
}>) {
  const [editing,  setEditing]  = useState(false);
  const [eIconId,  setEIconId]  = useState<number | null>(item.icon_id ?? null);
  const [eName,    setEName]    = useState(item.name);
  const [saving,   setSaving]   = useState(false);

  const saveEdit = async () => {
    if (!eName.trim()) return;
    setSaving(true);
    try { await onUpdate(item.id, eIconId, eName); setEditing(false); }
    finally { setSaving(false); }
  };

  const handleCat = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const catId = e.target.value ? Number.parseInt(e.target.value) : null;
    await onCategoryChange(item.id, catId);
  };

  return (
    <div className={`manage-item${item.is_active ? '' : ' manage-item--inactive'}`}>
      {editing ? (
        <>
          <IconPicker icons={icons} value={eIconId} onChange={setEIconId} fallbackEmoji={item.emoji} size="sm" />
          <input className="input--flex" value={eName} onChange={e => setEName(e.target.value)}
            placeholder="Name…" autoFocus onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }} />
          <div className="manage-item__actions">
            <Button size="sm" variant="accent" onClick={saveEdit} disabled={saving || !eName.trim()}>✓</Button>
            <Button size="sm" variant="ghost"  onClick={() => setEditing(false)}>✕</Button>
          </div>
        </>
      ) : (
        <>
          <span className="manage-item__name">
<>
            <IconDisplay icon={icons.find(i => i.id === item.icon_id) ?? null} fallbackEmoji={item.emoji} size="sm" className="trackable-emoji" />{item.name}
            </>
          </span>
          <div className="manage-item__actions">
            {item.is_active && (
              <>
                <Button size="icon" variant="ghost" onClick={onMoveUp}   disabled={isFirst} title="Move up">↑</Button>
                <Button size="icon" variant="ghost" onClick={onMoveDown} disabled={isLast}  title="Move down">↓</Button>
              </>
            )}
            {item.is_active && (
              <select className="settings-select" value={item.category_id ?? ''} onChange={handleCat} title="Category">
                <option value="">No category</option>
                {categories.filter(c => c.is_active).map(c => (
                  <option key={c.id} value={c.id}>{c.category_name}</option>
                ))}
              </select>
            )}
            <Button size="icon" variant="ghost" onClick={() => { setEIconId(item.icon_id ?? null); setEName(item.name); setEditing(true); }} title="Edit">✏️</Button>
            <Button size="sm"   variant={item.is_active ? 'ghost' : 'accent'} onClick={() => onToggle(item.id, !item.is_active)}>
              {item.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <ConfirmButton onConfirm={() => onDelete(item.id)} size="sm">✕</ConfirmButton>
          </div>
        </>
      )}
    </div>
  );
}

// ── CategorizedBooleanList ────────────────────────────────────────────────────

function CategorizedBooleanList({ initialItems, categories, icons }: Readonly<{
  initialItems: DailyTrackableRow[];
  categories:   TrackableCategoryRow[];
  icons:        IconRow[];
}>) {
  const supabase = createClient();
  const [items,   setItems]   = useState<DailyTrackableRow[]>(initialItems);
  const [eIconId, setEIconId] = useState<number | null>(null);
  const [eName,   setEName]   = useState('');
  const [adding,  setAdding]  = useState(false);

  const active   = items.filter(i =>  i.is_active).sort(bySortOrder);
  const inactive = items.filter(i => !i.is_active).sort(bySortOrder);

  const onUpdate = useCallback(async (id: number, iconId: number | null, name: string) => {
    await updateSettingsItem(supabase, 'daily_trackables', id, { icon_id: iconId ?? null, name: name.trim() });
    setItems(prev => prev.map(t => t.id === id ? { ...t, icon_id: iconId ?? null, name: name.trim() } : t));
  }, [supabase]);

  const onCategoryChange = useCallback(async (id: number, catId: number | null) => {
    await setTrackableCategory(supabase, id, catId);
    setItems(prev => prev.map(t => t.id === id ? { ...t, category_id: catId } : t));
  }, [supabase]);

  const onToggle = useCallback(async (id: number, active: boolean) => {
    await toggleSettingsItem(supabase, 'daily_trackables', id, active);
    setItems(prev => prev.map(t => t.id === id ? { ...t, is_active: active } : t));
  }, [supabase]);

  const onDelete = useCallback(async (id: number) => {
    await deleteSettingsItem(supabase, 'daily_trackables', id);
    setItems(prev => prev.filter(t => t.id !== id));
  }, [supabase]);

  const onMove = useCallback(async (id: number, direction: 'up' | 'down') => {
    const sorted  = items.filter(i => i.is_active).sort(bySortOrder);
    const idx     = sorted.findIndex(t => t.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const updates = normalizedReorderUpdates(sorted, idx, swapIdx);
    const map     = new Map(updates.map(u => [u.id, u.sort_order]));
    setItems(prev => prev.map(t => map.has(t.id) ? { ...t, sort_order: map.get(t.id)! } : t));
    await batchSetSortOrder(supabase, 'daily_trackables', updates);
  }, [supabase, items]);

  const add = useCallback(async () => {
    if (!eName.trim() || adding) return;
    setAdding(true);
    try {
      const payload = { track_type: 'boolean', name: eName.trim(), icon_id: eIconId, sort_order: active.length };
      const { data, error } = await supabase.from('daily_trackables').insert(payload).select().single();
      if (error) throw new Error(error.message);
      setItems(prev => [...prev, data as DailyTrackableRow]);
      setEIconId(null); setEName('');
    } finally { setAdding(false); }
  }, [supabase, eName, eIconId, active.length, adding]);

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <span className="settings-section__title">Boolean Metrics</span>
        <span className="manage-item__meta">{active.length} active</span>
      </div>
      <p className="settings-section__desc">
        Done / not-done trackables on the daily Overview tab. Use the category dropdown to group them.
      </p>

      <div className="manage-list">
        {active.length === 0 && <p className="empty-state">None active.</p>}
        {active.map((t, idx) => (
          <BooleanRow key={t.id} item={t} categories={categories} icons={icons}
            isFirst={idx === 0} isLast={idx === active.length - 1}
            onUpdate={onUpdate} onCategoryChange={onCategoryChange}
            onToggle={onToggle} onDelete={onDelete}
            onMoveUp={() => onMove(t.id, 'up')}
            onMoveDown={() => onMove(t.id, 'down')}
          />
        ))}
      </div>

      {inactive.length > 0 && (
        <details className="manage-inactive">
          <summary className="manage-inactive__summary">{inactive.length} inactive</summary>
          <div className="manage-inactive__body">
            {inactive.map(t => (
              <BooleanRow key={t.id} item={t} categories={categories} icons={icons}
                isFirst={false} isLast={false}
                onUpdate={onUpdate} onCategoryChange={onCategoryChange}
                onToggle={onToggle} onDelete={onDelete}
                onMoveUp={() => {}} onMoveDown={() => {}}
              />
            ))}
          </div>
        </details>
      )}

      <div className="manage-add-row">
        <IconPicker icons={icons} value={eIconId} onChange={setEIconId} size="sm" />
        <input type="text" value={eName} onChange={e => setEName(e.target.value)}
          placeholder="Habit name…" className="input--flex"
          onKeyDown={e => e.key === 'Enter' && add()} />
        <Button size="sm" variant="accent" onClick={add} disabled={adding || !eName.trim()}>
          {adding ? '…' : '+ Add'}
        </Button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TrackableSettings({ trackables, categories, icons }: Readonly<Props>) {
  const boolean   = trackables.filter(t => t.track_type === 'boolean');
  const numeric   = trackables.filter(t => t.track_type === 'numeric');
  const aggregate = trackables.filter(t => t.track_type === 'aggregate');

  return (
    <div>
      <ManageableList
        title="Habit Categories"
        description="Group your boolean metrics into labelled sections on the daily card."
        tableName="trackable_categories"
        nameColumn="category_name"
        items={categories}
        addFields={[
          { key: 'category_name', label: 'Category name', type: 'text', placeholder: 'e.g. Morning, Health', required: true },
        ]}
      />

      <CategorizedBooleanList initialItems={boolean} categories={categories} icons={icons} />

      <ManageableList
        title="Numeric Metrics"
        description="Slider-based (0–10) trackables on the Metrics tab."
        tableName="daily_trackables"
        nameColumn="name"
        items={numeric}
        extraDefaultFields={{ track_type: 'numeric' }}
        icons={icons}
        addFields={[
          { key: 'icon_id',   label: 'Icon',        type: 'icon' },
          { key: 'name',      label: 'Metric name', type: 'text',  placeholder: 'e.g. Nausea', required: true },
          { key: 'color_hex', label: 'Color',       type: 'color', width: 48 },
        ]}
        renderName={item => <><IconDisplay icon={icons.find(i => i.id === item.icon_id) ?? null} fallbackEmoji={typeof item.emoji === 'string' ? item.emoji : null} size="sm" className="trackable-emoji" />{String(item.name)}</>}
      />

      {aggregate.length > 0 && (
        <div className="settings-section">
          <div className="settings-section__header">
            <span className="settings-section__title">Aggregate Metrics</span>
          </div>
          <p className="settings-section__desc">Computed automatically. Not editable here.</p>
          {aggregate.map(t => (
            <div key={t.id} className="manage-item">
              <span className="manage-item__name">
<><IconDisplay icon={icons.find(i => i.id === t.icon_id) ?? null} fallbackEmoji={t.emoji} size="sm" className="trackable-emoji" />{t.name}</>
              </span>
              <span className="badge">aggregate</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
