'use client';

/**
 * ManageableList — reusable flat settings list.
 *
 * Add row, inline edit and activate/deactivate (via the ⋯ menu), and
 * drag-to-reorder when the table has a sort_order column. Fields are
 * described by `addFields` and rendered by FieldInputs.
 *
 * For lists grouped by category, use HierarchicalList instead.
 *
 * By default it saves through the settings DAL (tableName). Pass `dal` for
 * a table that needs more (e.g. a person's diagnoses), and `bare` to render
 * just the list and add row, inside another card's section.
 *
 * Rows that are links rather than settings (e.g. what's in a layout card)
 * have no active state: give `dal.remove` and they get "Remove" instead of
 * Deactivate. `editable={false}` drops "Edit" (nothing to edit in a row);
 * `itemDialog` adds a ⋯ item opening a dialog for more than fits in a row.
 */

import { useState, useCallback, type ReactNode } from 'react';
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
  Button, DragHandle, ManageItem, RowMenu, SortableItem, SortableList, EmptyState, SectionCard, InactiveGroup,
  Dialog,
} from '@/components/ui';
import type { RowMenuItem, SortMove } from '@/components/ui';
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

/** Custom saves, for tables the settings DAL doesn't cover. */
export interface ManageableListDal {
  add:      (payload: Record<string, unknown>, sortOrder: number) => Promise<Item>;
  update:   (id: number, payload: Record<string, unknown>) => Promise<void>;
  toggle:   (id: number, active: boolean) => Promise<void>;
  /** Enables drag-to-reorder. */
  reorder?: (updates: { id: number; sort_order: number }[]) => Promise<void>;
  /** For rows with no active state: "Remove" replaces Deactivate/Activate. */
  remove?:  (id: number) => Promise<void>;
}

interface Props {
  title?:      string;
  description?: string;
  /** Settings table to save to (ignored when `dal` is given). */
  tableName?:  ManageableTable;
  dal?:        ManageableListDal;
  /** No SectionCard around it (for use inside another card). */
  bare?:       boolean;
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
  /** Whether rows have an "Edit" item (default true). */
  editable?:   boolean;
  /** An extra ⋯ item that opens a dialog for editing more than fits in a row.
   *  `render` gets the item and a `patch` to update what the row shows. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemDialog?: { label: string; title: (item: any) => ReactNode; render: (item: any, patch: (p: Record<string, unknown>) => void) => ReactNode };
}

export function ManageableList({
  title, description, tableName, nameColumn, items: initialItems, addFields, renderName,
  extraDefaultFields = {},
  icons = [],
  onItemAdded,
  collapsibleAdd = false,
  dal: customDal,
  bare = false,
  editable = true,
  itemDialog,
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
  // The dialog's item is kept after closing so its content doesn't blank
  // out during the exit animation; `dialogOpen` controls visibility.
  const [dialogId,    setDialogId]    = useState<number | null>(null);
  const [dialogOpen,  setDialogOpen]  = useState(false);

  // Tables with a sort_order column (seen on their rows) can be reordered.
  const tableHasSort = items.length > 0 && 'sort_order' in items[0];
  const dal: ManageableListDal = customDal ?? {
    add:     (payload, sortOrder) => addSettingsItem<Item>(supabase, tableName!,
               tableHasSort ? { ...payload, sort_order: sortOrder } : payload),
    update:  async (id, payload)  => { await updateSettingsItem(supabase, tableName!, id, payload); },
    toggle:  (id, active)         => toggleSettingsItem(supabase, tableName!, id, active),
    reorder: updates              => batchSetSortOrder(supabase, tableName!, updates),
  };
  const hasSortOrder = Boolean(dal.reorder) && tableHasSort;

  const active   = items.filter(i =>  i.is_active).sort(bySortOrder);
  const inactive = items.filter(i => !i.is_active).sort(bySortOrder);

  const nameOf = (item: Item) => String(item[nameColumn] ?? '');

  // ── Toggle active ──────────────────────────────────────────────────────────

  const toggleActive = useCallback(async (item: Item) => {
    const next = !item.is_active;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: next } : i));
    await dal.toggle(item.id, next);
  }, [dal]);

  const remove = useCallback(async (item: Item) => {
    await dal.remove?.(item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
  }, [dal]);

  // ── Add ────────────────────────────────────────────────────────────────────

  const add = useCallback(async () => {
    const shown    = visibleFields(addFields, 'add', newVals);
    const required = shown.filter(f => f.required !== false && f.type !== 'icon');
    if (required.some(f => !newVals[f.key]?.trim())) return;

    setSaving(true);
    try {
      const payload = buildPayload(shown, newVals, newIcons);
      Object.assign(payload, extraDefaultFields);

      const data = await dal.add(payload, active.length);
      setItems(prev => [...prev, data]);
      const blank = emptyValues(addFields);
      setNewVals(blank.values);
      setNewIcons(blank.iconValues);
      onItemAdded?.(data);
    } finally { setSaving(false); }
  }, [dal, addFields, newVals, newIcons, active.length, extraDefaultFields, onItemAdded]);

  // ── Reorder (drag and drop) ────────────────────────────────────────────────

  const handleMove = useCallback(async ({ fromIndex, toIndex }: SortMove) => {
    const updates   = reorderUpdates(active, fromIndex, toIndex);
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
    setItems(prev => prev.map(i => updateMap.has(i.id) ? { ...i, sort_order: updateMap.get(i.id)! } : i));
    await dal.reorder?.(updates);
  }, [dal, active]);

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
    await dal.update(editId, payload);
    setItems(prev => prev.map(i => i.id === editId ? { ...i, ...payload } : i));
    setEditId(null);
  }, [dal, editId, editVals, editIcons, addFields]);

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
              ...(editable ? [{ label: 'Edit', onSelect: () => startEdit(item) }] : []),
              ...(itemDialog ? [{ label: itemDialog.label, onSelect: () => { setDialogId(item.id); setDialogOpen(true); } }] : []),
              dal.remove
                ? { label: 'Remove', onSelect: () => remove(item), destructive: true }
                : { label: item.is_active ? 'Deactivate' : 'Activate', onSelect: () => toggleActive(item) },
            ] satisfies RowMenuItem[]}
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

  const content = (
    <>

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
    </>
  );

  const dialogItem = itemDialog && dialogId != null ? items.find(i => i.id === dialogId) : undefined;
  const dialog = itemDialog && dialogItem && (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title={itemDialog.title(dialogItem)} placement="auto">
      {itemDialog.render(dialogItem, patch =>
        setItems(prev => prev.map(i => i.id === dialogItem.id ? { ...i, ...patch } : i)))}
    </Dialog>
  );

  if (bare) return <>{content}{dialog}</>;
  return (
    <SectionCard title={title ?? ''} meta={`${active.length} active`} description={description}>
      {content}
      {dialog}
    </SectionCard>
  );
}
