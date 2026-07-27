'use client';

import { useState, useCallback } from 'react';
import { createClient }      from '@/lib/supabase/client';
import {
  toggleSettingsItem,
  addSettingsItem,
  updateSettingsItem,
  deleteSettingsItem,
  reorderSettingsItem,
} from '@/lib/dal/settings';
import type { ManageableTable } from '@/lib/dal/settings';
import { Button }        from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';

export interface AddField {
  key:          string;
  label:        string;
  type:         'text' | 'number' | 'color';
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
}

const bySortOrder = (a: Item, b: Item) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

/**
 * Reusable settings list. Handles toggle, add, inline edit,
 * delete (with confirmation), and sort-order reordering (↑/↓).
 */
export function ManageableList({
  title, description, tableName, nameColumn, items: initialItems, addFields, renderName,
  extraDefaultFields = {},
}: Readonly<Props>) {
  const supabase = createClient();

  const [items,    setItems]    = useState<Item[]>(initialItems as Item[]);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [editVals, setEditVals] = useState<Record<string, string>>({});
  const [newVals,  setNewVals]  = useState<Record<string, string>>(
    Object.fromEntries(addFields.map(f => [f.key, '']))
  );
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
    const required = addFields.filter(f => f.required !== false);
    if (required.some(f => !newVals[f.key]?.trim())) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of addFields) {
        payload[f.key] = f.type === 'number'
          ? (newVals[f.key] ? Number.parseFloat(newVals[f.key]) : null)
          : (newVals[f.key]?.trim() || null);
      }
      if (hasSortOrder) payload.sort_order = active.length;
      Object.assign(payload, extraDefaultFields);

      const data = await addSettingsItem<Item>(supabase, tableName, payload);
      setItems(prev => [...prev, data]);
      setNewVals(Object.fromEntries(addFields.map(f => [f.key, ''])));
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
    const a = sortedActive[idx];
    const b = sortedActive[swapIdx];
    const oA = a.sort_order ?? idx;
    const oB = b.sort_order ?? swapIdx;
    // Optimistic local update
    setItems(prev => prev.map(i =>
      i.id === a.id ? { ...i, sort_order: oB } :
      i.id === b.id ? { ...i, sort_order: oA } : i
    ));
    await reorderSettingsItem(supabase, tableName, a.id, oA, b.id, oB);
  }, [supabase, tableName, items, hasSortOrder]);

  // ── Inline edit ────────────────────────────────────────────────────────────

  const startEdit = (item: Item) => {
    setEditId(item.id);
    const vals: Record<string, string> = {};
    for (const f of addFields) {
      vals[f.key] = item[f.key] != null ? String(item[f.key]) : '';
    }
    setEditVals(vals);
  };

  const saveEdit = useCallback(async () => {
    if (!editId) return;
    const payload: Record<string, unknown> = {};
    for (const f of addFields) {
      payload[f.key] = f.type === 'number'
        ? (editVals[f.key] ? Number.parseFloat(editVals[f.key]) : null)
        : (editVals[f.key]?.trim() || null);
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
            {addFields.map(f => (
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
              <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>Edit</Button>
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
        {addFields.map(f => (
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
