'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button }       from '@/components/ui/Button';

export interface AddField {
  key:         string;
  label:       string;
  type:        'text' | 'number';
  placeholder?: string;
  required?:   boolean;
  width?:      number;   // px, for short fields like emoji
}

interface Item {
  id:        number;
  is_active: boolean;
  [key: string]: unknown;
}

interface Props {
  title:       string;
  description?: string;
  tableName:   string;           // Supabase table name
  nameColumn:  string;           // which column is the display name
  items:       Item[];
  addFields:   AddField[];       // fields shown in the Add form
  renderName?: (item: Item) => React.ReactNode;  // custom display
  extraDefaultFields?: Record<string, string | boolean | number>;  // hidden defaults merged into insert
}

/**
 * Reusable settings list that handles:
 * - Display active/inactive items
 * - Toggle is_active
 * - Add new row
 * - Inline edit name
 */
export function ManageableList({
  title, description, tableName, nameColumn, items: initialItems, addFields, renderName,
  extraDefaultFields = {},
}: Props) {
  const supabase = createClient();

  const [items,    setItems]    = useState<Item[]>(initialItems);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [editVals, setEditVals] = useState<Record<string, string>>({});
  const [newVals,  setNewVals]  = useState<Record<string, string>>(
    Object.fromEntries(addFields.map(f => [f.key, '']))
  );
  const [saving,   setSaving]   = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const active   = items.filter(i => i.is_active);
  const inactive = items.filter(i => !i.is_active);

  // ── Toggle active ─────────────────────────────────────────────────────────

  const toggleActive = useCallback(async (item: Item) => {
    const next = !item.is_active;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: next } : i));
    await supabase.from(tableName).update({ is_active: next }).eq('id', item.id);
  }, [supabase, tableName]);

  // ── Add ──────────────────────────────────────────────────────────────────

  const add = useCallback(async () => {
    const required = addFields.filter(f => f.required !== false);
    if (required.some(f => !newVals[f.key]?.trim())) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of addFields) {
        payload[f.key] = f.type === 'number'
          ? (newVals[f.key] ? parseFloat(newVals[f.key]) : null)
          : (newVals[f.key]?.trim() || null);
      }
      // Only inject sort_order if the table actually has that column
      // (detected by checking if existing items have it)
      if (items.length > 0 && 'sort_order' in items[0]) {
        payload.sort_order = items.length;
      }
      // Merge caller-supplied hidden defaults (e.g. track_type for daily_trackables)
      Object.assign(payload, extraDefaultFields);

      const { data, error } = await supabase.from(tableName).insert(payload).select().single();
      if (!error && data) {
        setItems(prev => [...prev, data as Item]);
        setNewVals(Object.fromEntries(addFields.map(f => [f.key, ''])));
      }
    } finally { setSaving(false); }
  }, [supabase, tableName, addFields, newVals, items]);

  // ── Inline edit ───────────────────────────────────────────────────────────

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
        ? (editVals[f.key] ? parseFloat(editVals[f.key]) : null)
        : (editVals[f.key]?.trim() || null);
    }
    const { data } = await supabase.from(tableName).update(payload).eq('id', editId).select().single();
    if (data) setItems(prev => prev.map(i => i.id === editId ? { ...i, ...data } : i));
    setEditId(null);
  }, [supabase, tableName, editId, editVals, addFields]);

  // ── Render item row ───────────────────────────────────────────────────────

  const renderItem = (item: Item) => {
    const isEditing = editId === item.id;

    return (
      <div key={item.id} className={`manage-item${item.is_active ? '' : ' manage-item--inactive'}`}>
        {isEditing ? (
          <>
            {addFields.map(f => (
              <input
                key={f.key}
                type={f.type}
                value={editVals[f.key] ?? ''}
                onChange={e => setEditVals(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ flex: f.width ? 'none' : 1, width: f.width ?? undefined }}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null); }}
                autoFocus={f.key === nameColumn}
              />
            ))}
            <div className="manage-item__actions">
              <Button size="sm" variant="accent" onClick={saveEdit}>✓</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>✕</Button>
            </div>
          </>
        ) : (
          <>
            <span className="manage-item__name">
              {renderName ? renderName(item) : String(item[nameColumn] ?? '')}
            </span>
            <div className="manage-item__actions">
              <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>Edit</Button>
              <Button
                size="sm"
                variant={item.is_active ? 'ghost' : 'accent'}
                onClick={() => toggleActive(item)}
              >
                {item.is_active ? 'Deactivate' : 'Activate'}
              </Button>
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

      {/* Active items */}
      <div style={{ marginBottom: 12 }}>
        {active.length === 0 && <p className="empty-state">None active.</p>}
        {active.map(renderItem)}
      </div>

      {/* Inactive */}
      {inactive.length > 0 && (
        <details style={{ marginBottom: 10 }}>
          <summary
            style={{ fontSize: '0.75rem', color: 'var(--text-faint)', cursor: 'pointer', padding: '4px 0' }}
            onClick={() => setShowInactive(s => !s)}
          >
            {inactive.length} inactive
          </summary>
          <div style={{ marginTop: 6 }}>{inactive.map(renderItem)}</div>
        </details>
      )}

      {/* Add form */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        {addFields.map(f => (
          <input
            key={f.key}
            type={f.type}
            value={newVals[f.key] ?? ''}
            onChange={e => setNewVals(prev => ({ ...prev, [f.key]: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={f.placeholder ?? f.label}
            style={{ flex: f.width ? 'none' : 1, width: f.width ?? undefined, minWidth: 80 }}
          />
        ))}
        <Button
          size="sm"
          variant="accent"
          onClick={add}
          disabled={saving || !newVals[nameField.key]?.trim()}
        >
          {saving ? '…' : `+ Add`}
        </Button>
      </div>
    </div>
  );
}
