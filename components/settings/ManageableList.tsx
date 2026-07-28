'use client';

import { useState, useCallback } from 'react';
import { createClient }      from '@/lib/supabase/client';
import {
  toggleSettingsItem,
  addSettingsItem,
  updateSettingsItem,
  deleteSettingsItem,
  batchSetSortOrder,
} from '@/lib/dal/settings';
import type { ManageableTable } from '@/lib/dal/settings';
import { bySortOrder, normalizedReorderUpdates } from '@/lib/utils/sort';
import { Button }        from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { IconPicker }    from '@/components/ui/IconPicker';
import type { IconRow } from '@/types/schema';

export interface AddField {
  key:          string;
  label:        string;
  type:         'text' | 'number' | 'color' | 'icon';
  placeholder?: string;
  required?:    boolean;
  width?:       number;   // px, for short fields like emoji
}

interface Item {
  id:          number;
  is_active:   boolean;
  sort_order?: number;
  [key: string]: unknown;
}

interface Props {
  title:       string;
  description?: string;
  tableName:   ManageableTable;
  nameColumn:  string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items:       any[];
  addFields:   AddField[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderName?: (item: any) => React.ReactNode;
  extraDefaultFields?: Record<string, string | boolean | number>;
  icons?:      IconRow[];  // required when any addField has type 'icon'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onItemAdded?: (item: any) => void; // called after a successful add
}

/**
 * Reusable settings list. Handles toggle, add, inline edit,
 * delete (with confirmation), and sort-order reordering (↑/↓).
 */
export function ManageableList({
  title, description, tableName, nameColumn, items: initialItems, addFields, renderName,
  extraDefaultFields = {},
  icons = [],
  onItemAdded,
}: Readonly<Props>) {
  const supabase = createClient();

  const [items,    setItems]    = useState<Item[]>(initialItems as Item[]);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [editVals, setEditVals] = useState<Record<string, string>>({});
  const [newVals,  setNewVals]  = useState<Record<string, string>>(
    Object.fromEntries(addFields.map(f => [f.key, '']))
  );
  // Separate state for icon_id fields (number|null vs string)
  const iconFields = addFields.filter(f => f.type === 'icon');
  const [iconNewVals,  setIconNewVals]  = useState<Record<string, number | null>>(
    Object.fromEntries(iconFields.map(f => [f.key, null]))
  );
  const [iconEditVals, setIconEditVals] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);

  const hasSortOrder = items.length > 0 && 'sort_order' in items[0];

  const active   = items.filter(i =>  i.is_active).sort(bySortOrder);
  const inactive = items.filter(i => !i.is_active).sort(bySortOrder);

  // ── Toggle active ──────────────────────────────────────────────────────────

  const toggleActive = useCallback(async (item: Item) => {
    const next = !item.is_active;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: next } : i));
    await toggleSettingsItem(supabase, tableName, item.id, next);
  }, [supabase, tableName]);

  // ── Add ────────────────────────────────────────────────────────────────────

  const add = useCallback(async () => {
    const required = addFields.filter(f => f.required !== false && f.type !== 'icon');
    if (required.some(f => !newVals[f.key]?.trim())) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of addFields) {
        if (f.type === 'icon') {
          payload[f.key] = iconNewVals[f.key] ?? null;
        } else if (f.type === 'number') {
          payload[f.key] = newVals[f.key] ? Number.parseFloat(newVals[f.key]) : null;
        } else {
          payload[f.key] = newVals[f.key]?.trim() || null;
        }
      }
      if (hasSortOrder) payload.sort_order = active.length;
      Object.assign(payload, extraDefaultFields);

      const data = await addSettingsItem<Item>(supabase, tableName, payload);
      setItems(prev => [...prev, data]);
      setNewVals(Object.fromEntries(addFields.filter(f => f.type !== 'icon').map(f => [f.key, ''])));
      setIconNewVals(Object.fromEntries(iconFields.map(f => [f.key, null])));
      onItemAdded?.(data);
    } finally { setSaving(false); }
  }, [supabase, tableName, addFields, newVals, active.length, hasSortOrder, extraDefaultFields]);

  // ── Delete ─────────────────────────────────────────────────────────────────

  const remove = useCallback(async (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await deleteSettingsItem(supabase, tableName, id);
  }, [supabase, tableName]);

  // ── Sort ───────────────────────────────────────────────────────────────────

  const moveItem = useCallback(async (item: Item, direction: 'up' | 'down') => {
    if (!hasSortOrder) return;
    const sortedActive = items.filter(i => i.is_active).sort(bySortOrder);
    const idx     = sortedActive.findIndex(i => i.id === item.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedActive.length) return;
    // Normalize all sort_orders to sequential values — fixes the all-zeros problem
    const updates = normalizedReorderUpdates(sortedActive, idx, swapIdx);
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
    setItems(prev => prev.map(i => updateMap.has(i.id) ? { ...i, sort_order: updateMap.get(i.id)! } : i));
    await batchSetSortOrder(supabase, tableName, updates);
  }, [supabase, tableName, items, hasSortOrder]);

  // ── Inline edit ────────────────────────────────────────────────────────────

  const startEdit = (item: Item) => {
    setEditId(item.id);
    const vals: Record<string, string> = {};
    const iconVals: Record<string, number | null> = {};
    for (const f of addFields) {
      if (f.type === 'icon') {
        iconVals[f.key] = (item[f.key] as number | null) ?? null;
      } else {
        vals[f.key] = item[f.key] != null ? String(item[f.key]) : '';
      }
    }
    setEditVals(vals);
    setIconEditVals(iconVals);
  };

  const saveEdit = useCallback(async () => {
    if (!editId) return;
    const payload: Record<string, unknown> = {};
    for (const f of addFields) {
      if (f.type === 'icon') {
        payload[f.key] = iconEditVals[f.key] ?? null;
      } else if (f.type === 'number') {
        payload[f.key] = editVals[f.key] ? Number.parseFloat(editVals[f.key]) : null;
      } else {
        payload[f.key] = editVals[f.key]?.trim() || null;
      }
    }
    const data = await updateSettingsItem<Item>(supabase, tableName, editId, payload);
    setItems(prev => prev.map(i => i.id === editId ? { ...i, ...data } : i));
    setEditId(null);
  }, [supabase, tableName, editId, editVals, addFields]);

  const handleEditChange  = useCallback((key: string, value: string) => setEditVals(prev => ({ ...prev, [key]: value })), []);
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  saveEdit();
    if (e.key === 'Escape') setEditId(null);
  }, [saveEdit]);
  const handleNewChange   = useCallback((key: string, value: string) => setNewVals(prev => ({ ...prev, [key]: value })), []);
  const handleNewKeyDown  = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') add();
  }, [add]);

  // ── Render item row ────────────────────────────────────────────────────────

  const renderItem = (item: Item, idxInActive: number) => {
    const isEditing = editId === item.id;

    return (
      <div key={item.id} className={`manage-item${item.is_active ? '' : ' manage-item--inactive'}`}>
        {isEditing ? (
          <>
            {addFields.map(f => f.type === 'icon' ? (
              <IconPicker
                key={f.key}
                icons={icons}
                value={iconEditVals[f.key] ?? null}
                onChange={id => setIconEditVals(prev => ({ ...prev, [f.key]: id }))}
                size="sm"
              />
            ) : (
              // Dynamic px width from caller config — legitimate inline style exception
              <input
                key={f.key}
                type={f.type}
                value={editVals[f.key] ?? ''}
                onChange={e => handleEditChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{ flex: f.width ? 'none' : 1, width: f.width ?? undefined }}
                onKeyDown={handleEditKeyDown}
                autoFocus={f.key === nameColumn}
              />
            ))}
            <div className="manage-item__actions">
              <Button size="sm" variant="accent" onClick={saveEdit}>✓</Button>
              <Button size="sm" variant="ghost"  onClick={() => setEditId(null)}>✕</Button>
            </div>
          </>
        ) : (
          <>
            <span className="manage-item__name">
              {renderName ? renderName(item) : String(item[nameColumn] ?? '')}
            </span>
            <div className="manage-item__actions">
              {item.is_active && hasSortOrder && (
                <>
                  <Button size="icon" variant="ghost" title="Move up"
                    disabled={idxInActive === 0}
                    onClick={() => moveItem(item, 'up')}>↑</Button>
                  <Button size="icon" variant="ghost" title="Move down"
                    disabled={idxInActive === active.length - 1}
                    onClick={() => moveItem(item, 'down')}>↓</Button>
                </>
              )}
              <Button size="icon" variant="ghost" onClick={() => startEdit(item)} title="Edit">✏️</Button>
              <Button
                size="sm"
                variant={item.is_active ? 'ghost' : 'accent'}
                onClick={() => toggleActive(item)}
              >
                {item.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <ConfirmButton onConfirm={() => remove(item.id)} size="sm">✕</ConfirmButton>
            </div>
          </>
        )}
      </div>
    );
  };

  const nameField = addFields.find(f => f.key === nameColumn) ?? addFields[0];

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <span className="settings-section__title">{title}</span>
        <span className="manage-item__meta">{active.length} active</span>
      </div>
      {description && <p className="settings-section__desc">{description}</p>}

      <div className="manage-list">
        {active.length === 0 && <p className="empty-state">None active.</p>}
        {active.map((item, idx) => renderItem(item, idx))}
      </div>

      {inactive.length > 0 && (
        <details className="manage-inactive">
          <summary className="manage-inactive__summary">
            {inactive.length} inactive
          </summary>
          <div className="manage-inactive__body">
            {inactive.map(item => renderItem(item, -1))}
          </div>
        </details>
      )}

      <div className="manage-add-row">
        {addFields.map(f => f.type === 'icon' ? (
          <IconPicker
            key={f.key}
            icons={icons}
            value={iconNewVals[f.key] ?? null}
            onChange={id => setIconNewVals(prev => ({ ...prev, [f.key]: id }))}
            size="sm"
          />
        ) : (
          <input
            key={f.key}
            type={f.type}
            value={newVals[f.key] ?? ''}
            onChange={e => handleNewChange(f.key, e.target.value)}
            onKeyDown={handleNewKeyDown}
            placeholder={f.placeholder ?? f.label}
            // Dynamic px width — legitimate inline style exception
            style={{ flex: f.width ? 'none' : 1, width: f.width ?? undefined, minWidth: 80 }}
          />
        ))}
        <Button
          size="sm"
          variant="accent"
          onClick={add}
          disabled={saving || !newVals[nameField.key]?.trim()}
        >
          {saving ? '…' : '+ Add'}
        </Button>
      </div>
    </div>
  );
}
