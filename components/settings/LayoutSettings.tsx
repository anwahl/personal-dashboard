'use client';

/**
 * LayoutSettings (Settings → Layout)
 *
 * What shows where. One list per area (Daily page, Home, Quick add):
 * sections (the daily page's tabs; groups on Home and in Quick add) hold
 * cards, and cards hold trackable categories or components. Nothing shows
 * until it's placed here.
 *
 *   - Sections: add, rename, (de)activate, drag to reorder.
 *   - Cards: a title (optional) and a first item when added; edit the title,
 *     (de)activate, drag to reorder or into another section.
 *     ⋯ → Contents… to add, remove and reorder what's in the card.
 *   - A card holds categories or components, not both.
 *   - Categories and components can go anywhere. Outside the daily page,
 *     a card with categories enters today's values and has its own Save.
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  addSection, renameSection, toggleSection, reorderSections,
  addCard, updateCardTitle, toggleCard, moveCard, reorderCards,
  addCategoryToCard, addModuleToCard, removeCardItem, reorderCardItems,
} from '@/lib/dal/placement';
import { HierarchicalList, type NormalizedChild } from './HierarchicalList';
import { ManageableList } from './ManageableList';
import { Badge } from '@/components/ui';
import { MODULE_LABELS } from '@/components/sections/ModuleView';
import { MODULES, type Area, type Module, type TrackableCategoryRow } from '@/types/schema';
import type { CardItem, SectionDetail } from '@/types/dal';

const AREA_META: Record<Area, { title: string; description: string; sectionNoun: [string, string] }> = {
  DAILY: {
    title:       'Daily page',
    description: 'Each section is a tab on the daily page (before Meds, Journal and Brain dump).',
    sectionNoun: ['tab', 'tabs'],
  },
  HOME: {
    title:       'Home',
    description: 'Sections are rows on the Home page, below the clock and intention; each card is a column.',
    sectionNoun: ['section', 'sections'],
  },
  QUICKADD: {
    title:       'Quick add',
    description: 'Sections are groups at the top of the ＋ Quick add sheet, before Brain dump.',
    sectionNoun: ['section', 'sections'],
  },
};

const AREA_ORDER: Area[] = ['DAILY', 'HOME', 'QUICKADD'];

/** An item's key in a select: "category:3" or "module:TASK_LIST". */
const itemKey = (item: { kind: 'category'; category_id: number } | { kind: 'module'; module: Module }) =>
  item.kind === 'category' ? `category:${item.category_id}` : `module:${item.module}`;

function parseKey(key: string): { kind: 'category'; category_id: number } | { kind: 'module'; module: Module } {
  const [kind, value] = key.split(':');
  return kind === 'category' ? { kind, category_id: Number(value) } : { kind: 'module', module: value as Module };
}

// ── One area ──────────────────────────────────────────────────────────────────

function AreaLayout({ area, sections, categories }: Readonly<{
  area:       Area;
  sections:   SectionDetail[];
  categories: TrackableCategoryRow[];
}>) {
  const supabase = createClient();
  const meta     = AREA_META[area];
  // Card id → its items (kept here: the list's rows only hold what they show).
  const [itemsByCard, setItemsByCard] = useState<Record<number, CardItem[]>>(
    () => Object.fromEntries(sections.flatMap(s => s.cards.map(c => [c.id, c.items]))),
  );

  const categoryName = (id: number) => categories.find(c => c.id === id)?.category_name ?? '?';
  const itemName = (item: CardItem) =>
    item.kind === 'category' ? categoryName(item.category_id) : MODULE_LABELS[item.module];

  /** What can be added to a card that already holds `items`. */
  const optionsFor = (items: CardItem[]) => {
    const kinds  = new Set(items.map(i => i.kind));
    const placed = new Set(items.map(itemKey));
    const options: { value: string; label: string }[] = [];
    if (!kinds.has('module')) {
      options.push(...categories
        .filter(c => c.is_active && !placed.has(`category:${c.id}`))
        .sort((a, b) => a.category_name.localeCompare(b.category_name))
        .map(c => ({ value: `category:${c.id}`, label: `Category: ${c.category_name}` })));
    }
    if (!kinds.has('category')) {
      options.push(...MODULES
        .filter(m => !placed.has(`module:${m}`))
        .map(m => ({ value: `module:${m}`, label: `Component: ${MODULE_LABELS[m]}` })));
    }
    return options;
  };

  const addItem = async (cardId: number, key: string, sortOrder: number): Promise<CardItem> => {
    const parsed = parseKey(key);
    const item = parsed.kind === 'category'
      ? await addCategoryToCard(supabase, cardId, parsed.category_id, sortOrder)
      : await addModuleToCard(supabase, cardId, parsed.module, sortOrder);
    setItemsByCard(prev => ({ ...prev, [cardId]: [...(prev[cardId] ?? []), item] }));
    return item;
  };

  const cardChild = (card: { id: number; title: string | null; is_active: boolean; sort_order: number }): NormalizedChild => ({
    id: card.id, name: card.title ?? '', title: card.title ?? '', is_active: card.is_active, sort_order: card.sort_order,
  });

  return (
    <HierarchicalList
      title={meta.title}
      description={meta.description}
      categoryNoun={meta.sectionNoun}
      catPlaceholder={`New ${meta.sectionNoun[0]}…`}
      initialCategories={sections.map(s => ({
        id: s.id, name: s.name, is_active: s.is_active, sort_order: s.sort_order,
        children: s.cards.map(cardChild),
      }))}
      childFields={[
        { key: 'name',  type: 'text',   label: 'Title', placeholder: 'Card title (optional)', required: false },
        {
          key: 'first', type: 'select', label: 'First item', placeholder: 'Put in it…', required: true,
          showInEdit: false, options: optionsFor([]),
        },
      ]}
      renderChildName={child => {
        const items = itemsByCard[child.id] ?? [];
        return (
          <>
            {child.name || <em>Untitled card</em>}
            {items.map(i => <Badge key={`${i.kind}${i.placement_id}`}>{itemName(i)}</Badge>)}
          </>
        );
      }}
      childDialog={{
        label: 'Contents…',
        title: child => child.name || 'Untitled card',
        render: child => {
          const items = itemsByCard[child.id] ?? [];
          // Rows need unique ids across both kinds: components use negative ids.
          const rowId = (i: CardItem) => i.kind === 'category' ? i.placement_id : -i.placement_id;
          const byRow = (id: number) => items.find(i => rowId(i) === id);
          return (
            <ManageableList
              bare
              editable={false}
              nameColumn="item"
              items={items.map(i => ({ id: rowId(i), item: itemName(i), is_active: true, sort_order: i.sort_order }))}
              renderName={row => <>{row.item}</>}
              addFields={[{ key: 'item', type: 'select', label: 'Item', placeholder: 'Add…', required: true, options: optionsFor(items) }]}
              dal={{
                add: async (payload, sortOrder) => {
                  const item = await addItem(child.id, String(payload.item), sortOrder);
                  return { id: rowId(item), item: itemName(item), is_active: true, sort_order: item.sort_order };
                },
                update: async () => {},
                toggle: async () => {},
                remove: async id => {
                  const item = byRow(id);
                  if (!item) return;
                  await removeCardItem(supabase, item.kind, item.placement_id);
                  setItemsByCard(prev => ({ ...prev, [child.id]: (prev[child.id] ?? []).filter(i => i !== item) }));
                },
                reorder: async updates => {
                  const order = new Map(updates.map(u => [u.id, u.sort_order]));
                  const moved = items.flatMap(i => order.has(rowId(i))
                    ? [{ kind: i.kind, placement_id: i.placement_id, sort_order: order.get(rowId(i))! }] : []);
                  await reorderCardItems(supabase, moved);
                  setItemsByCard(prev => ({
                    ...prev,
                    [child.id]: (prev[child.id] ?? [])
                      .map(i => order.has(rowId(i)) ? { ...i, sort_order: order.get(rowId(i))! } : i)
                      .sort((a, b) => a.sort_order - b.sort_order),
                  }));
                },
              }}
            />
          );
        },
      }}
      dal={{
        addCategory: async (name, sort) => addSection(supabase, area, name, sort),
        updateCategory: (id, name) => renameSection(supabase, id, name),
        toggleCategory: (id, active) => toggleSection(supabase, id, active),
        reorderCategories: updates => reorderSections(supabase, updates),
        addChild: async (sectionId, values, sort) => {
          const card = await addCard(supabase, sectionId!, values.name ? String(values.name) : null, sort);
          await addItem(card.id, String(values.first), 0);
          return card;
        },
        updateChild: (id, values) => updateCardTitle(supabase, id, values.name ? String(values.name) : null),
        toggleChild: (id, active) => toggleCard(supabase, id, active),
        reorderChildren: updates => reorderCards(supabase, updates),
        moveChild: async (id, sectionId) => { if (sectionId != null) await moveCard(supabase, id, sectionId); },
      }}
    />
  );
}

// ── LayoutSettings ────────────────────────────────────────────────────────────

export function LayoutSettings({ sections, categories }: Readonly<{
  /** Every section (all areas, inactive included) with cards and items. */
  sections:   SectionDetail[];
  /** Trackable categories (kept current by Settings → Tracking). */
  categories: TrackableCategoryRow[];
}>) {
  return (
    <div>
      {AREA_ORDER.map(area => (
        <AreaLayout key={area} area={area} categories={categories}
          sections={sections.filter(s => s.area === area)} />
      ))}
    </div>
  );
}
