'use client';

/**
 * ManageableList — reusable flat settings list.
 *
 * Add row, inline edit and activate/deactivate (via the ⋯ menu), and
 * drag-to-reorder when the table has a sort_order column. Fields are
 * described by `addFields` and rendered by FieldInputs.
 *
 * For lists grouped by category, use HierarchicalList instead.
 */

import { useState, useCallback } from 'react';
import { createClient }      from '@/lib/supabase/client';
import {
  toggleSettingsItem,
  addSettingsItem,
  updateSettingsItem,
  batchSetSortOrder,
} from '@/lib/dal/settings';
import type { ManageableTable }      from '@/lib/dal/settings';
import { bySortOrder, reorderUpdates } from '@/lib/utils/sort';
import {
  Button, DragHandle, ManageItem, RowMenu, SortableItem, SortableList, EmptyState, SectionCard, InactiveGroup
} from '@/components/ui';
import type { SortMove } from '@/components/ui';
import {
  FieldInputs, buildPayload, emptyValues, valuesFrom, visibleFields,
  type AddField, type FieldValues, type IconValues,
} from './FieldInputs';
import type { IconRow } from '@/types/schema';

export type { AddField } from './FieldInputs';

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
  /** Collapse the add row behind a button until the user expands it. Default: false. */
  collapsibleAdd?: boolean;
}

export function ManageableList({
  title, description, tableName, nameColumn, items: initialItems, addFields, renderName,
  extraDefaultFields = {},
  icons = [],
  onItemAdded,
  collapsibleAdd = false,
}: Readonly<Props>) {
  const supabase = createClient();

  const [items,       setItems]       = useState<Item[]>(initialItems as Item[]);
  const [editId,      setEditId]      = useState<number | null>(null);
  const [editVals,    setEditVals]    = useState<FieldValues>({});
  const [editIcons,   setEditIcons]   = useState<IconValues>({});
  const [addExpanded, setAddExpanded] = useState(!collapsibleAdd);
  const [newVals,     setNewVals]     = useState<FieldValues>(() => emptyValues(addFields).values);
  const [newIcons,    setNewIcons]    = useState<IconValues>(() => emptyValues(addFields).iconValues);
  const [saving,      setSaving]      = useState(false);

  const hasSortOrder = items.length > 0 && 'sort_order' in items[0];

  const active   = items.filter(i =>  i.is_active).sort(bySortOrder);
  const inactive = items.filter(i => !i.is_active).sort(bySortOrder);

  const nameOf = (item: Item) => String(item[nameColumn] ?? '');

  // ── Toggle active ──────────────────────────────────────────────────────────

  const toggleActive = useCallback(async (item: Item) => {
    const next = !item.is_active;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: next } : i));
    await toggleSettingsItem(supabase, tableName, item.id, next);
  }, [supabase, tableName]);

  // ── Add ────────────────────────────────────────────────────────────────────

  const add = useCallback(async () => {
    const shown    = visibleFields(addFields, 'add', newVals);
    const required = shown.filter(f => f.required !== false && f.type !== 'icon');
    if (required.some(f => !newVals[f.key]?.trim())) return;

    setSaving(true);
    try {
      const payload = buildPayload(shown, newVals, newIcons);
      if (hasSortOrder) payload.sort_order = active.length;
      Object.assign(payload, extraDefaultFields);

      const data = await addSettingsItem<Item>(supabase, tableName, payload);
      setItems(prev => [...prev, data]);
      const blank = emptyValues(addFields);
      setNewVals(blank.values);
      setNewIcons(blank.iconValues);
      onItemAdded?.(data);
    } finally { setSaving(false); }
  }, [supabase, tableName, addFields, newVals, newIcons, active.length, hasSortOrder, extraDefaultFields, onItemAdded]);

  // ── Reorder (drag and drop) ────────────────────────────────────────────────

  const handleMove = useCallback(async ({ fromIndex, toIndex }: SortMove) => {
    const updates   = reorderUpdates(active, fromIndex, toIndex);
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
    setItems(prev => prev.map(i => updateMap.has(i.id) ? { ...i, sort_order: updateMap.get(i.id)! } : i));
    await batchSetSortOrder(supabase, tableName, updates);
  }, [supabase, tableName, active]);

  // ── Inline edit ────────────────────────────────────────────────────────────

  const startEdit = (item: Item) => {
    // All fields, so showWhen can see add-only values while editing.
    const { values, iconValues } = valuesFrom(addFields, item);
    setEditVals(values);
    setEditIcons(iconValues);
    setEditId(item.id);
  };

  const saveEdit = useCallback(async () => {
    if (!editId) return;
    const payload = buildPayload(visibleFields(addFields, 'edit', editVals), editVals, editIcons);
    const data = await updateSettingsItem<Item>(supabase, tableName, editId, payload);
    setItems(prev => prev.map(i => i.id === editId ? { ...i, ...data } : i));
    setEditId(null);
  }, [supabase, tableName, editId, editVals, editIcons, addFields]);

  // ── Row ────────────────────────────────────────────────────────────────────

  const renderRow = (item: Item, sortable?: { ref: (el: Element | null) => void; handleRef: (el: Element | null) => void; isDragging: boolean }) => {
    const name = nameOf(item);
    return (
      <ManageItem
        ref={sortable?.ref}
        dragging={sortable?.isDragging}
        inactive={!item.is_active}
        handle={sortable && <DragHandle ref={sortable.handleRef} label={`Drag to reorder ${name}`} />}
        menu={
          <RowMenu
            label={name}
            items={[
              { label: 'Edit', onSelect: () => startEdit(item) },
              { label: item.is_active ? 'Deactivate' : 'Activate', onSelect: () => toggleActive(item) },
            ]}
          />
        }
        editing={editId === item.id ? (
          <>
            <FieldInputs
              fields={addFields}
              mode="edit"
              values={editVals}
              iconValues={editIcons}
              onChange={(key, value) => setEditVals(prev => ({ ...prev, [key]: value }))}
              onIconChange={(key, id) => setEditIcons(prev => ({ ...prev, [key]: id }))}
              onEnter={saveEdit}
              onEscape={() => setEditId(null)}
              icons={icons}
              autoFocusKey={nameColumn}
            />
            <Button size="sm" variant="accent" onClick={saveEdit} aria-label="Save">✓</Button>
            <Button size="sm" variant="ghost"  onClick={() => setEditId(null)} aria-label="Cancel">✕</Button>
          </>
        ) : undefined}
      >
        {renderName ? renderName(item) : name}
      </ManageItem>
    );
  };

  const nameField = addFields.find(f => f.key === nameColumn) ?? addFields[0];

  return (
    <SectionCard title={title} meta={`${active.length} active`} description={description}>

      <div className="manage-list">
        {active.length === 0 && <EmptyState>None active.</EmptyState>}
        {hasSortOrder ? (
          <SortableList onMove={handleMove}>
            {active.map((item, idx) => (
              <SortableItem key={item.id} id={`row:${item.id}`} index={idx}>
                {sortable => renderRow(item, sortable)}
              </SortableItem>
            ))}
          </SortableList>
        ) : (
          active.map(item => <div key={item.id}>{renderRow(item)}</div>)
        )}
      </div>

      <InactiveGroup count={inactive.length}>
        {inactive.map(item => <div key={item.id}>{renderRow(item)}</div>)}
      </InactiveGroup>

      {!addExpanded ? (
        <div className="manage-add-row">
          <Button variant="ghost" size="sm" onClick={() => setAddExpanded(true)}>+ Add</Button>
        </div>
      ) : (
        <div className="manage-add-row">
          <FieldInputs
            fields={addFields}
            mode="add"
            values={newVals}
            iconValues={newIcons}
            onChange={(key, value) => setNewVals(prev => ({ ...prev, [key]: value }))}
            onIconChange={(key, id) => setNewIcons(prev => ({ ...prev, [key]: id }))}
            onEnter={add}
            icons={icons}
          />
          <Button
            size="sm"
            variant="accent"
            onClick={add}
            busy={saving} disabled={!newVals[nameField.key]?.trim()}
          >
            + Add
          </Button>
          {collapsibleAdd && (
            <Button size="sm" variant="ghost" onClick={() => setAddExpanded(false)}>Cancel</Button>
          )}
        </div>
      )}
    </SectionCard>
  );
}
