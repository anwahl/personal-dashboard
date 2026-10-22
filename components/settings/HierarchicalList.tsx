'use client';

/**
 * HierarchicalList — the grouped settings list (category → items).
 *
 * The one pattern for any setting whose items belong to a category: symptom
 * types, journal prompts (daily + weekly), metrics, …
 *
 *   - Category headings: rename / activate via ⋯, drag to reorder.
 *   - Items: fields described by `childFields` (rendered by FieldInputs, the
 *     same as ManageableList); edit / activate via ⋯; drag to reorder within
 *     a category (unless `childrenSortable` is false).
 *   - Nothing is deleted from here: settings are deactivated, which keeps
 *     the history that points at them.
 *   - With `dal.moveChild`: drag an item into another category, or use
 *     ⋯ → Move to ▸.
 *   - With `uncategorized`: a final "Uncategorized" group for items whose
 *     category is optional and unset.
 *
 * The caller normalises its data into NormalizedCat[] and provides a `dal`
 * of pre-bound async functions. No Supabase client or table names live here.
 */

import { useState, useCallback, type ReactNode } from 'react';
import {
  Button, DragHandle, ManageItem, RowMenu, SortableGroup, SortableItem, SortableList, EmptyState, SectionCard, InactiveGroup
} from '@/components/ui';
import type { RowMenuAction, RowMenuItem, SortMove } from '@/components/ui';
import {
  FieldInputs, buildPayload, emptyValues, valuesFrom, visibleFields,
  type AddField, type FieldValues, type IconValues,
} from './FieldInputs';
import { bySortOrder, reorderUpdates, sequentialUpdates } from '@/lib/utils/sort';
import type { IconRow } from '@/types/schema';

// ── Normalised data shape ─────────────────────────────────────────────────────

export interface NormalizedChild {
  id:         number;
  /** Display name (also the value of the `name` field). */
  name:       string;
  is_active:  boolean;
  sort_order: number;
  /** Any extra fields described by `childFields` (icon_id, color_hex, …). */
  [key: string]: unknown;
}

export interface NormalizedCat {
  id:         number;
  name:       string;
  is_active:  boolean;
  sort_order: number;
  children:   NormalizedChild[];
}

// ── DAL interface ─────────────────────────────────────────────────────────────

/** Minimum shape that add operations must return. */
interface AddResult {
  id:          number;
  is_active:   boolean;
  sort_order?: number | null;
}

type SortUpdate = { id: number; sort_order: number };
type ChildValues = Record<string, unknown>;

export interface HierarchicalListDal {
  addCategory:       (name: string, sortOrder: number)                              => Promise<AddResult>;
  updateCategory:    (id: number, name: string)                                     => Promise<void>;
  toggleCategory:    (id: number, active: boolean)                                  => Promise<void>;
  reorderCategories: (updates: SortUpdate[])                                        => Promise<void>;
  /** catId is null when adding to the Uncategorized group. */
  addChild:          (catId: number | null, values: ChildValues, sortOrder: number) => Promise<AddResult>;
  updateChild:       (id: number, values: ChildValues)                              => Promise<void>;
  toggleChild:       (id: number, active: boolean)                                  => Promise<void>;
  reorderChildren:   (updates: SortUpdate[])                                        => Promise<void>;
  /** Moves a child to another category (null = Uncategorized). Enables drag
   *  between categories and the ⋯ → Move to menu. */
  moveChild?:        (id: number, catId: number | null)                             => Promise<void>;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  title:             string;
  description?:      string;
  initialCategories: NormalizedCat[];
  /** Items with no category. When provided (even empty), an Uncategorized
   *  group is shown after the categories. */
  uncategorized?:    NormalizedChild[];
  uncategorizedLabel?: string;
  /** Item fields. Default: one name field (see childInputType / childPlaceholder). */
  childFields?:      AddField[];
  /** Default name field: 'input' (default) for short labels; 'textarea' for long text. */
  childInputType?:   'input' | 'textarea';
  childItalic?:      boolean;
  /** Default name field placeholder: a string, or a fn of the category name. */
  childPlaceholder?: string | ((catName: string) => string);
  /** Whether items can be dragged to reorder (default true). Off for items
   *  whose order doesn't matter, e.g. journal prompts, which are picked at random. */
  childrenSortable?: boolean;
  /** Custom display for an item (default: its name). */
  renderChildName?:  (child: NormalizedChild) => ReactNode;
  catPlaceholder?:   string;
  icons?:            IconRow[];
  /** Called after a category is added (e.g. so other lists can offer it). */
  onCategoryAdded?:  (cat: { id: number; name: string }) => void;
  /** Called after an item is added. */
  onChildAdded?:     (child: NormalizedChild) => void;
  dal:               HierarchicalListDal;
}

const NAME_KEY    = 'name';
const UNCAT_GROUP = 'uncat';
const catGroup    = (catId: number) => `cat:${catId}`;
const catIdOf     = (group: string | undefined): number | null =>
  group && group.startsWith('cat:') ? Number(group.slice(4)) : null;

// ── Component ─────────────────────────────────────────────────────────────────

export function HierarchicalList({
  title,
  description,
  initialCategories,
  uncategorized,
  uncategorizedLabel = 'Uncategorized',
  childFields,
  childInputType   = 'input',
  childItalic      = false,
  childPlaceholder = 'Add item…',
  childrenSortable = true,
  renderChildName,
  catPlaceholder   = 'New category…',
  icons            = [],
  onCategoryAdded,
  onChildAdded,
  dal,
}: Readonly<Props>) {
  const [cats,        setCats]        = useState<NormalizedCat[]>(initialCategories);
  const [uncat,       setUncat]       = useState<NormalizedChild[] | null>(uncategorized ?? null);
  const [newCatName,  setNewCatName]  = useState('');
  const [addingCat,   setAddingCat]   = useState(false);
  const [newByGroup,  setNewByGroup]  = useState<Record<string, { values: FieldValues; iconValues: IconValues }>>({});
  const [addingGroup, setAddingGroup] = useState<string | null>(null);
  const [editingCat,  setEditingCat]  = useState<{ id: number; name: string } | null>(null);
  const [editChild,   setEditChild]   = useState<{ id: number; values: FieldValues; iconValues: IconValues } | null>(null);

  const canMove = !!dal.moveChild;

  const fieldsFor = useCallback((catName: string): AddField[] => childFields ?? [{
    key:         NAME_KEY,
    label:       'Name',
    type:        childInputType === 'textarea' ? 'textarea' : 'text',
    required:    true,
    placeholder: typeof childPlaceholder === 'function' ? childPlaceholder(catName) : childPlaceholder,
  }], [childFields, childInputType, childPlaceholder]);

  // ── Group helpers ─────────────────────────────────────────────────────────

  const childrenOf = useCallback((group: string): NormalizedChild[] => {
    if (group === UNCAT_GROUP) return uncat ?? [];
    return cats.find(c => catGroup(c.id) === group)?.children ?? [];
  }, [cats, uncat]);

  const setChildrenOf = useCallback((group: string, update: (children: NormalizedChild[]) => NormalizedChild[]) => {
    if (group === UNCAT_GROUP) setUncat(prev => update(prev ?? []));
    else setCats(prev => prev.map(c => catGroup(c.id) === group ? { ...c, children: update(c.children) } : c));
  }, []);

  /** Applies { id → sort_order } to every child in the given groups. */
  const applyOrder = useCallback((groups: string[], updates: SortUpdate[]) => {
    const order = new Map(updates.map(u => [u.id, u.sort_order]));
    for (const g of groups) {
      setChildrenOf(g, children => children.map(ch => order.has(ch.id) ? { ...ch, sort_order: order.get(ch.id)! } : ch));
    }
  }, [setChildrenOf]);

  // ── Category operations ───────────────────────────────────────────────────

  const addCategory = useCallback(async () => {
    const name = newCatName.trim();
    if (!name) return;
    setAddingCat(true);
    try {
      const data = await dal.addCategory(name, cats.length);
      setCats(prev => [...prev, {
        id: data.id, name, is_active: data.is_active,
        sort_order: data.sort_order ?? prev.length,
        children: [],
      }]);
      setNewCatName('');
      onCategoryAdded?.({ id: data.id, name });
    } finally { setAddingCat(false); }
  }, [dal, newCatName, cats.length, onCategoryAdded]);

  const saveCategoryName = useCallback(async () => {
    if (!editingCat) return;
    const name = editingCat.name.trim();
    if (!name) return;
    await dal.updateCategory(editingCat.id, name);
    setCats(prev => prev.map(c => c.id === editingCat.id ? { ...c, name } : c));
    setEditingCat(null);
  }, [dal, editingCat]);

  const toggleCategory = useCallback(async (catId: number, active: boolean) => {
    await dal.toggleCategory(catId, active);
    setCats(prev => prev.map(c => c.id === catId ? { ...c, is_active: active } : c));
  }, [dal]);

  // ── Child operations ──────────────────────────────────────────────────────

  const newFor = (group: string, fields: AddField[]) => newByGroup[group] ?? emptyValues(fields);

  const addChild = useCallback(async (group: string, fields: AddField[]) => {
    const current  = newByGroup[group] ?? emptyValues(fields);
    const shown    = visibleFields(fields, 'add', current.values);
    const required = shown.filter(f => f.required !== false && f.type !== 'icon');
    if (required.some(f => !current.values[f.key]?.trim())) return;

    setAddingGroup(group);
    try {
      const values    = buildPayload(shown, current.values, current.iconValues);
      const siblings  = childrenOf(group);
      const data      = await dal.addChild(catIdOf(group), values, siblings.length);
      const child: NormalizedChild = {
        ...values,
        ...data,
        id:         data.id,
        name:       String(values[NAME_KEY] ?? ''),
        is_active:  data.is_active,
        sort_order: data.sort_order ?? siblings.length,
      };
      setChildrenOf(group, children => [...children, child]);
      setNewByGroup(prev => ({ ...prev, [group]: emptyValues(fields) }));
      onChildAdded?.(child);
    } finally { setAddingGroup(null); }
  }, [dal, newByGroup, childrenOf, setChildrenOf, onChildAdded]);

  const startEditChild = (child: NormalizedChild, fields: AddField[]) => {
    // All fields, so showWhen can see add-only values (e.g. a type) while editing.
    const { values, iconValues } = valuesFrom(fields, child);
    setEditChild({ id: child.id, values, iconValues });
  };

  const saveChild = useCallback(async (group: string, fields: AddField[]) => {
    if (!editChild) return;
    const payload = buildPayload(visibleFields(fields, 'edit', editChild.values), editChild.values, editChild.iconValues);
    await dal.updateChild(editChild.id, payload);
    setChildrenOf(group, children => children.map(ch => ch.id === editChild.id
      ? { ...ch, ...payload, name: payload[NAME_KEY] != null ? String(payload[NAME_KEY]) : ch.name }
      : ch));
    setEditChild(null);
  }, [dal, editChild, setChildrenOf]);

  const toggleChild = useCallback(async (group: string, childId: number, active: boolean) => {
    await dal.toggleChild(childId, active);
    setChildrenOf(group, children => children.map(ch => ch.id === childId ? { ...ch, is_active: active } : ch));
  }, [dal, setChildrenOf]);

  /** Moves a child to another group at `toIndex` among its active children. */
  const moveChildToGroup = useCallback(async (childId: number, fromGroup: string, toGroup: string, toIndex?: number) => {
    if (!dal.moveChild || fromGroup === toGroup) return;
    const child = childrenOf(fromGroup).find(ch => ch.id === childId);
    if (!child) return;

    const sourceActive = childrenOf(fromGroup).filter(ch => ch.is_active && ch.id !== childId).sort(bySortOrder);
    const targetActive = childrenOf(toGroup).filter(ch => ch.is_active).sort(bySortOrder);
    const insertAt     = Math.min(toIndex ?? targetActive.length, targetActive.length);
    if (child.is_active) targetActive.splice(insertAt, 0, child);
    const updates = [...sequentialUpdates(sourceActive), ...sequentialUpdates(targetActive)];

    setChildrenOf(fromGroup, children => children.filter(ch => ch.id !== childId));
    setChildrenOf(toGroup,   children => [...children, child]);
    applyOrder([fromGroup, toGroup], updates);

    await dal.moveChild(childId, catIdOf(toGroup));
    await dal.reorderChildren(updates);
  }, [dal, childrenOf, setChildrenOf, applyOrder]);

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const sortedCats   = [...cats].sort(bySortOrder);
  const activeCats   = sortedCats.filter(c =>  c.is_active);
  const inactiveCats = sortedCats.filter(c => !c.is_active);

  const handleMove = useCallback(async (move: SortMove) => {
    if (move.type === 'category') {
      const updates   = reorderUpdates(activeCats, move.fromIndex, move.toIndex);
      const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
      setCats(prev => prev.map(c => updateMap.has(c.id) ? { ...c, sort_order: updateMap.get(c.id)! } : c));
      await dal.reorderCategories(updates);
      return;
    }

    const childId   = Number(move.id.split(':')[1]);
    const fromGroup = move.fromGroup ?? '';
    const toGroup   = move.toGroup ?? fromGroup;

    if (fromGroup !== toGroup) {
      await moveChildToGroup(childId, fromGroup, toGroup, move.toIndex);
      return;
    }
    const active  = childrenOf(fromGroup).filter(ch => ch.is_active).sort(bySortOrder);
    const updates = reorderUpdates(active, move.fromIndex, move.toIndex);
    applyOrder([fromGroup], updates);
    await dal.reorderChildren(updates);
  }, [dal, activeCats, childrenOf, applyOrder, moveChildToGroup]);

  // ── Render: item rows ─────────────────────────────────────────────────────

  const moveToMenu = (child: NormalizedChild, group: string): RowMenuItem[] => {
    if (!canMove) return [];
    const targets: RowMenuAction[] = activeCats.map(c => ({
      label:    c.name,
      checked:  catGroup(c.id) === group,
      disabled: catGroup(c.id) === group,
      onSelect: () => moveChildToGroup(child.id, group, catGroup(c.id)),
    }));
    if (uncat) {
      targets.push({
        label:    uncategorizedLabel,
        checked:  group === UNCAT_GROUP,
        disabled: group === UNCAT_GROUP,
        onSelect: () => moveChildToGroup(child.id, group, UNCAT_GROUP),
      });
    }
    return [{ label: 'Move to', submenu: targets }];
  };

  const renderChild = (
    child: NormalizedChild,
    group: string,
    fields: AddField[],
    sortable?: { ref: (el: Element | null) => void; handleRef: (el: Element | null) => void; isDragging: boolean },
  ) => {
    const isEditing = editChild?.id === child.id;
    return (
      <ManageItem
        ref={sortable?.ref}
        dragging={sortable?.isDragging}
        inactive={!child.is_active}
        italic={childItalic}
        handle={sortable && <DragHandle ref={sortable.handleRef} label={`Drag to reorder ${child.name}`} />}
        menu={
          <RowMenu
            label={child.name}
            items={[
              { label: 'Edit', onSelect: () => startEditChild(child, fields) },
              { label: child.is_active ? 'Deactivate' : 'Activate', onSelect: () => toggleChild(group, child.id, !child.is_active) },
              ...moveToMenu(child, group),
            ]}
          />
        }
        editing={isEditing && editChild ? (
          <>
            <FieldInputs
              fields={fields}
              mode="edit"
              values={editChild.values}
              iconValues={editChild.iconValues}
              onChange={(key, value) => setEditChild(prev => prev && ({ ...prev, values: { ...prev.values, [key]: value } }))}
              onIconChange={(key, id) => setEditChild(prev => prev && ({ ...prev, iconValues: { ...prev.iconValues, [key]: id } }))}
              onEnter={() => saveChild(group, fields)}
              onEscape={() => setEditChild(null)}
              icons={icons}
              autoFocusKey={NAME_KEY}
            />
            <Button size="sm" variant="accent" onClick={() => saveChild(group, fields)} aria-label="Save">✓</Button>
            <Button size="sm" variant="ghost"  onClick={() => setEditChild(null)} aria-label="Cancel">✕</Button>
          </>
        ) : undefined}
      >
        {renderChildName ? renderChildName(child) : child.name}
      </ManageItem>
    );
  };

  /** The items of one group: sortable active rows, inactive rows, add row. */
  const renderGroupBody = (group: string, catName: string, sortable: boolean) => {
    const fields   = fieldsFor(catName);
    const children = childrenOf(group);
    const active   = children.filter(ch =>  ch.is_active).sort(bySortOrder);
    const inactive = children.filter(ch => !ch.is_active).sort(bySortOrder);
    const newVals  = newFor(group, fields);
    const itemType = canMove ? 'item' : `item:${group}`;   // no moveChild → stay in own group
    const nameField = fields.find(f => f.key === NAME_KEY) ?? fields[0];

    return (
      <div className="category-block__body">
        <SortableGroup id={group} accept={itemType} className="category-block__items">
          {active.length === 0 && inactive.length === 0 && (
            <EmptyState>No items yet.</EmptyState>
          )}
          {active.map((ch, idx) => sortable && childrenSortable ? (
            <SortableItem key={ch.id} id={`item:${ch.id}`} index={idx} group={group} type={itemType}>
              {s => renderChild(ch, group, fields, s)}
            </SortableItem>
          ) : (
            <div key={ch.id}>{renderChild(ch, group, fields)}</div>
          ))}
        </SortableGroup>

        <InactiveGroup count={inactive.length}>
          {inactive.map(ch => <div key={ch.id}>{renderChild(ch, group, fields)}</div>)}
        </InactiveGroup>

        <div className="category-block__add-row">
          <FieldInputs
            fields={fields}
            mode="add"
            values={newVals.values}
            iconValues={newVals.iconValues}
            onChange={(key, value) => setNewByGroup(prev => {
              const cur = prev[group] ?? emptyValues(fields);
              return { ...prev, [group]: { ...cur, values: { ...cur.values, [key]: value } } };
            })}
            onIconChange={(key, id) => setNewByGroup(prev => {
              const cur = prev[group] ?? emptyValues(fields);
              return { ...prev, [group]: { ...cur, iconValues: { ...cur.iconValues, [key]: id } } };
            })}
            onEnter={() => addChild(group, fields)}
            icons={icons}
          />
          <Button
            size="sm" variant="ghost"
            onClick={() => addChild(group, fields)}
            disabled={addingGroup === group || !newVals.values[nameField.key]?.trim()}
          >
            {addingGroup === group ? '…' : '+ Add'}
          </Button>
        </div>
      </div>
    );
  };

  // ── Render: category headings ─────────────────────────────────────────────

  const renderHeading = (cat: NormalizedCat, handle?: ReactNode) => {
    const activeCount = cat.children.filter(ch => ch.is_active).length;
    return (
      <ManageItem
        heading
        inactive={!cat.is_active}
        handle={handle}
        inline={<span className="category-block__count">{activeCount}</span>}
        menu={
          <RowMenu
            label={cat.name}
            items={[
              { label: 'Rename', onSelect: () => setEditingCat({ id: cat.id, name: cat.name }) },
              { label: cat.is_active ? 'Deactivate' : 'Activate', onSelect: () => toggleCategory(cat.id, !cat.is_active) },
            ]}
          />
        }
        editing={editingCat?.id === cat.id ? (
          <>
            <FieldInputs
              fields={[{ key: NAME_KEY, label: 'Category name', type: 'text', required: true }]}
              mode="edit"
              values={{ [NAME_KEY]: editingCat.name }}
              iconValues={{}}
              onChange={(_, value) => setEditingCat(prev => prev && ({ ...prev, name: value }))}
              onIconChange={() => {}}
              onEnter={saveCategoryName}
              onEscape={() => setEditingCat(null)}
              autoFocusKey={NAME_KEY}
            />
            <Button size="sm" variant="accent" onClick={saveCategoryName} aria-label="Save">✓</Button>
            <Button size="sm" variant="ghost"  onClick={() => setEditingCat(null)} aria-label="Cancel">✕</Button>
          </>
        ) : undefined}
      >
        {cat.name}
      </ManageItem>
    );
  };

  return (
    <SectionCard title={title} description={description}>

      <SortableList onMove={handleMove}>
        {activeCats.map((cat, idx) => (
          <SortableItem key={cat.id} id={`category:${cat.id}`} index={idx} type="category">
            {({ ref, handleRef, isDragging }) => (
              <div ref={ref} className={`category-block${isDragging ? ' category-block--dragging' : ''}`}>
                {renderHeading(cat, <DragHandle ref={handleRef} label={`Drag to reorder ${cat.name}`} />)}
                {renderGroupBody(catGroup(cat.id), cat.name, true)}
              </div>
            )}
          </SortableItem>
        ))}

        {uncat && (
          <div className="category-block category-block--uncategorized">
            <ManageItem heading inline={<span className="category-block__count">{uncat.filter(ch => ch.is_active).length}</span>}>
              {uncategorizedLabel}
            </ManageItem>
            {renderGroupBody(UNCAT_GROUP, uncategorizedLabel, true)}
          </div>
        )}
      </SortableList>

      <InactiveGroup
        count={inactiveCats.length}
        label={`${inactiveCats.length} inactive ${inactiveCats.length === 1 ? 'category' : 'categories'}`}
      >
        {inactiveCats.map(cat => (
          <div key={cat.id} className="category-block">
            {renderHeading(cat)}
            {renderGroupBody(catGroup(cat.id), cat.name, false)}
          </div>
        ))}
      </InactiveGroup>

      <div className="category-block__footer">
        <input
          type="text"
          className="input--flex"
          aria-label="New category name"
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCategory()}
          placeholder={catPlaceholder}
        />
        <Button
          size="sm" variant="accent"
          onClick={addCategory}
          disabled={addingCat || !newCatName.trim()}
        >
          {addingCat ? '…' : '+ Category'}
        </Button>
      </div>
    </SectionCard>
  );
}
